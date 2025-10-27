import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { updateUserGroups } from '@/lib/db/users.db'
import { z } from 'zod'
import { fetchToken, isAdminToken, isSameOrigin } from '@/lib/auth/authz'

const Params = z.object({ id: z.string().min(1) })
const Body = z.object({ groupIds: z.array(z.string()).default([]) })

function extractUserIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string')
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (Array.isArray(obj.user_ids)) {
      return obj.user_ids.filter((v): v is string => typeof v === 'string')
    }
    if ('set' in obj && Array.isArray((obj as { set?: unknown }).set)) {
      const setVal = (obj as { set: unknown }).set
      return (Array.isArray(setVal) ? setVal : []).filter((v): v is string => typeof v === 'string')
    }
  }
  return []
}

/**
 * @swagger
 * /api/v1/users/{id}/groups:
 *   put:
 *     tags: [Users]
 *     summary: Update a user's group memberships
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
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: User groups updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Could not update user groups
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

    const { id: userId } = Params.parse(await params)
    const { groupIds } = Body.parse(await request.json())

    const selectedGroupIds = Array.from(new Set(groupIds))

    await updateUserGroups(userId, selectedGroupIds)

    revalidatePath('/admin/users')
    revalidateTag('admin-users')
    return NextResponse.json({ ok: true as const })
  } catch (error) {
    return NextResponse.json({ error: 'Could not update user groups' }, { status: 500 })
  }
}


