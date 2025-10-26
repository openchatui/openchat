import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import db from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { fetchToken, isAdminToken, isSameOrigin } from '@/lib/auth/authz'

// Reuse permisssion schemas similar to create route
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

const ModelPermissionsSchema = z.record(
  z.string(),
  z.object({ read: z.boolean().optional(), write: z.boolean().optional() }).partial().strict()
).optional()

const Params = z.object({ id: z.string().min(1) })

const UpdateBody = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  permissions: GroupPermissionsSchema.optional(),
  userIds: z.array(z.string()).optional(),
  modelPermissions: ModelPermissionsSchema,
})

type AccessList = { group_ids: string[]; user_ids: string[] }
type ModelAccessControl = { read: AccessList; write: AccessList }

function toAccessList(value: unknown): AccessList {
  const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const group_ids = Array.isArray(obj.group_ids) ? obj.group_ids.filter((v): v is string => typeof v === 'string') : []
  const user_ids = Array.isArray(obj.user_ids) ? obj.user_ids.filter((v): v is string => typeof v === 'string') : []
  return { group_ids, user_ids }
}

function toModelAccessControl(value: unknown): ModelAccessControl {
  const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return {
    read: toAccessList(obj.read),
    write: toAccessList(obj.write),
  }
}

function ensureIn(list: string[], idToAdd: string): string[] {
  return Array.from(new Set([...(Array.isArray(list) ? list : []), idToAdd]))
}

function ensureOut(list: string[], idToRemove: string): string[] {
  return (Array.isArray(list) ? list : []).filter((x) => x !== idToRemove)
}

/**
 * @swagger
 * /api/v1/groups/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update a group and its model access control
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *               modelPermissions:
 *                 type: object
 *                 additionalProperties:
 *                   type: object
 *                   properties:
 *                     read:
 *                       type: boolean
 *                     write:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Group updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 *       500:
 *         description: Could not update group
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = Params.parse(await params)
    const { name, description, permissions, userIds, modelPermissions } = UpdateBody.parse(await request.json())

    const nowSec = Math.floor(Date.now() / 1000)

    const updated = await db.group.update({
      where: { id },
      data: {
        name,
        description,
        permissions: (permissions ?? undefined) as unknown as Prisma.InputJsonValue,
        ...(userIds ? { userIds: Array.from(new Set(userIds)) } : {}),
        updatedAt: nowSec,
      },
      select: { id: true },
    })

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (modelPermissions && Object.keys(modelPermissions).length > 0) {
      const modelIds = Object.keys(modelPermissions)
      const models = await db.model.findMany({ where: { id: { in: modelIds } }, select: { id: true, accessControl: true } })
      await Promise.all(
        models.map(async (m) => {
          const selection = modelPermissions[m.id] || {}
          const current = toModelAccessControl(m.accessControl)
          const next: ModelAccessControl = {
            read: { group_ids: [...current.read.group_ids], user_ids: [...current.read.user_ids] },
            write: { group_ids: [...current.write.group_ids], user_ids: [...current.write.user_ids] },
          }

          if (selection.read) {
            next.read.group_ids = ensureIn(next.read.group_ids, id)
          } else {
            next.read.group_ids = ensureOut(next.read.group_ids, id)
          }

          if (selection.write) {
            next.write.group_ids = ensureIn(next.write.group_ids, id)
          } else {
            next.write.group_ids = ensureOut(next.write.group_ids, id)
          }

          const changed = JSON.stringify(current) !== JSON.stringify(next)
          if (changed) {
            await db.model.update({ where: { id: m.id }, data: { accessControl: next as unknown as Prisma.InputJsonValue } })
          }
        })
      )
    }

    revalidatePath('/admin/users')
    revalidateTag('admin-users')
    return NextResponse.json({ id })
  } catch (error) {
    return NextResponse.json({ error: 'Could not update group' }, { status: 500 })
  }
}


