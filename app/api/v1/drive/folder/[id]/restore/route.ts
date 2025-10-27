import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { getRootFolderId } from '@/lib/modules/drive'
import { z } from 'zod'
import { fetchToken, getUserIdFromToken, isSameOrigin } from '@/lib/auth/authz'

const ParamsSchema = z.object({ id: z.string().min(1) })

/**
 * @swagger
 * /api/v1/drive/folder/{id}/restore:
 *   patch:
 *     tags: [Tools]
 *     summary: Restore a folder from Trash
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
 *         description: Folder restored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 parentId:
 *                   type: string
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

    const existing = await db.folder.findUnique({ where: { id_userId: { id, userId } } })
    if (!existing) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })

    const meta = (existing.meta ?? {}) as Record<string, unknown>
    let previousParentId: string | null = (meta?.restore_id as string | undefined) ?? null
    if (!previousParentId) {
      previousParentId = await getRootFolderId(userId)
    }

    const nowSec = Math.floor(Date.now() / 1000)
    const nextMeta: Record<string, unknown> = { ...meta }
    delete (nextMeta as any).restore_id

    await db.folder.update({
      where: { id_userId: { id, userId } },
      data: {
        parentId: previousParentId,
        meta: JSON.parse(JSON.stringify(nextMeta)) as Prisma.InputJsonValue,
        updatedAt: nowSec,
      },
    })

    revalidatePath('/drive')
    revalidatePath('/drive/trash')

    return NextResponse.json({ ok: true, parentId: previousParentId })
  } catch (error) {
    console.error('PATCH /api/v1/drive/folder/{id}/restore error:', error)
    return NextResponse.json({ error: 'Failed to restore folder' }, { status: 500 })
  }
}


