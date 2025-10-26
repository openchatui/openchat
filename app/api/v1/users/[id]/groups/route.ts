import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import db from '@/lib/db'
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
 *     tags: [Admin]
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

    const groups = await db.group.findMany({ select: { id: true, userIds: true } })

    await Promise.all(
      groups.map(async (g) => {
        const current = extractUserIds(g.userIds)
        const shouldHave = selectedGroupIds.includes(g.id)
        const hasNow = current.includes(userId)
        let next = current
        if (shouldHave && !hasNow) next = Array.from(new Set([...current, userId]))
        if (!shouldHave && hasNow) next = current.filter((x) => x !== userId)
        const changed = next.length !== current.length || next.some((v, i) => v !== current[i])
        if (changed) {
          await db.group.update({ where: { id: g.id }, data: { userIds: next } })
        }
      })
    )

    revalidatePath('/admin/users')
    revalidateTag('admin-users')
    return NextResponse.json({ ok: true as const })
  } catch (error) {
    return NextResponse.json({ error: 'Could not update user groups' }, { status: 500 })
  }
}


