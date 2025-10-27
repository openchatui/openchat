import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { fetchToken, getUserIdFromToken, isSameOrigin } from '@/lib/auth/authz'

const BodySchema = z.object({ starred: z.boolean() })

/**
 * @swagger
 * /api/v1/drive/folder/{id}/star:
 *   patch:
 *     tags: [Tools]
 *     summary: Star or unstar a folder
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
 *               starred:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Star state updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Folder not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const token = await fetchToken(request)
    const userId = getUserIdFromToken(token)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await ctx.params
    const raw = await request.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const existing = await db.folder.findUnique({ where: { id_userId: { id, userId } } })
    if (!existing) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })

    const nowSec = Math.floor(Date.now() / 1000)
    const meta = { ...((existing.meta ?? {}) as Record<string, unknown>), starred: parsed.data.starred }
    await db.folder.update({ where: { id_userId: { id, userId } }, data: { meta, updatedAt: nowSec } })

    revalidatePath('/drive')
    revalidatePath('/drive/starred')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/v1/drive/folder/{id}/star error:', error)
    return NextResponse.json({ error: 'Failed to update star' }, { status: 500 })
  }
}


