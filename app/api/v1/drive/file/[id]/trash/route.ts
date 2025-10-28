import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTrashFolderId } from '@/lib/modules/drive'
import { fetchToken, getUserIdFromToken, isSameOrigin } from '@/lib/auth/authz'

const ParamsSchema = z.object({ id: z.string().min(1) })

/**
 * @swagger
 * /api/v1/drive/file/{id}/trash:
 *   patch:
 *     tags: [Drive]
 *     summary: Move a file to Trash
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File moved to Trash
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const token = await fetchToken(request)
    const userId = getUserIdFromToken(token)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = ParamsSchema.parse(await ctx.params)
    const trashId = await getTrashFolderId(userId)
    const nowSec = Math.floor(Date.now() / 1000)

    const existing = await db.file.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const previousParentId: string | null = existing.parentId ?? null
    const existingMeta = (existing.meta ?? {}) as Record<string, unknown>
    const nextMeta = { ...existingMeta, restore_id: previousParentId }

    const result = await db.file.updateMany({
      where: { id, userId },
      data: { parentId: trashId, meta: nextMeta, updatedAt: nowSec },
    })
    if (result.count === 0) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    revalidatePath('/drive/trash')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/v1/drive/file/{id}/trash error:', error)
    return NextResponse.json({ error: 'Failed to move file to trash' }, { status: 500 })
  }
}


