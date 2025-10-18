import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import db from '@/lib/db'
import { DEFAULT_GROUP_PERMISSIONS, type GroupPermissions } from '@/lib/modules/access-control/permissions.types'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { fetchToken, isAdminToken, isSameOrigin } from '@/lib/auth/authz'

const WorkspacePermsSchema = z.object({
  models: z.boolean().optional(),
  knowledge: z.boolean().optional(),
  prompts: z.boolean().optional(),
  tools: z.boolean().optional(),
}).partial()

const SharingPermsSchema = z.object({
  public_models: z.boolean().optional(),
  public_knowledge: z.boolean().optional(),
  public_prompts: z.boolean().optional(),
  public_tools: z.boolean().optional(),
}).partial()

const ChatPermsSchema = z.object({
  controls: z.boolean().optional(),
  valves: z.boolean().optional(),
  system_prompt: z.boolean().optional(),
  params: z.boolean().optional(),
  file_upload: z.boolean().optional(),
  delete: z.boolean().optional(),
  edit: z.boolean().optional(),
  share: z.boolean().optional(),
  export: z.boolean().optional(),
  stt: z.boolean().optional(),
  tts: z.boolean().optional(),
  call: z.boolean().optional(),
  multiple_models: z.boolean().optional(),
  temporary: z.boolean().optional(),
  temporary_enforced: z.boolean().optional(),
}).partial()

const FeaturesPermsSchema = z.object({
  direct_tool_servers: z.boolean().optional(),
  web_search: z.boolean().optional(),
  image_generation: z.boolean().optional(),
  code_interpreter: z.boolean().optional(),
  notes: z.boolean().optional(),
}).partial()

const GroupPermissionsSchema = z.object({
  workspace: WorkspacePermsSchema.optional(),
  sharing: SharingPermsSchema.optional(),
  chat: ChatPermsSchema.optional(),
  features: FeaturesPermsSchema.optional(),
}).partial()

const CreateBody = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  permissions: GroupPermissionsSchema.optional(),
  userIds: z.array(z.string()).optional(),
})

/**
 * @swagger
 * /api/v1/groups:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new group
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: object
 *                 description: Partial group permission overrides
 *                 additionalProperties: true
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Group created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Could not create group
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const token = await fetchToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdminToken(token)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, description, permissions: incomingPermissions, userIds: incomingUserIds } = CreateBody.parse(await request.json())

    const id = crypto.randomUUID()
    const nowSec = Math.floor(Date.now() / 1000)

    const permissions: GroupPermissions = {
      ...DEFAULT_GROUP_PERMISSIONS,
      ...(incomingPermissions ?? {}),
    }

    const userIds = Array.isArray(incomingUserIds) ? Array.from(new Set(incomingUserIds)) : []

    await db.group.create({
      data: {
        id,
        userId: (typeof token.sub === 'string' ? token.sub : undefined) ?? undefined,
        name,
        description,
        permissions: permissions as unknown as Prisma.InputJsonValue,
        userIds,
        createdAt: nowSec,
        updatedAt: nowSec,
      },
    })

    revalidatePath('/admin/users')
    revalidateTag('admin-users')
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Could not create group' }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/v1/groups:
 *   get:
 *     tags: [Admin]
 *     summary: List all groups
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of groups
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to fetch groups
 */
export async function GET(request: NextRequest) {
  try {
    const token = await fetchToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdminToken(token)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const groups = await db.group.findMany({
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        permissions: true,
        userIds: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(groups)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
  }
}


