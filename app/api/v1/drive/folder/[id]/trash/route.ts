import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getTrashFolderId } from '@/lib/modules/drive'
import { fetchToken, getUserIdFromToken, isSameOrigin } from '@/lib/auth/authz'

const ParamsSchema = z.object({ id: z.string().min(1) })

/**
 * @swagger
 * /api/v1/drive/folder/{id}/trash:
 *   patch:
 *     tags: [Drive]
 *     summary: Move a folder to Trash
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
 *         description: Folder moved to Trash
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

    const { id } = ParamsSchema.parse(await ctx.params)
    const trashId = await getTrashFolderId(userId)
    const nowSec = Math.floor(Date.now() / 1000)

    const existing = await db.folder.findUnique({ where: { id_userId: { id, userId } } })
    if (!existing) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })

    const previousParentId: string | null = existing.parentId ?? null
    const existingMeta = (existing.meta ?? {}) as Record<string, unknown>
    const nextMeta = { ...existingMeta, restore_id: previousParentId }

    await db.folder.update({
      where: { id_userId: { id, userId } },
      data: { parentId: trashId, meta: nextMeta, updatedAt: nowSec },
    })

    revalidatePath('/drive/trash')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/v1/drive/folder/{id}/trash error:', error)
    return NextResponse.json({ error: 'Failed to move folder to trash' }, { status: 500 })
  }
}


