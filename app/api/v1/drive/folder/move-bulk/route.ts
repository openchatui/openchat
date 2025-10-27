import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { fetchToken, getUserIdFromToken, isSameOrigin } from '@/lib/auth/authz'

const BodySchema = z.object({
  targetParentId: z.string().min(1),
  folderIds: z.array(z.string().min(1)).default([]),
  fileIds: z.array(z.string().min(1)).default([]),
})

/**
 * @swagger
 * /api/v1/drive/folder/move-bulk:
 *   post:
 *     tags: [Drive]
 *     summary: Bulk move folders and files to a new parent
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetParentId:
 *                 type: string
 *               folderIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               fileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Items moved
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const token = await fetchToken(request)
    const userId = getUserIdFromToken(token)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const raw = await request.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const { targetParentId, folderIds, fileIds } = parsed.data
    const nowSec = Math.floor(Date.now() / 1000)

    for (const id of folderIds) {
      await db.folder.update({
        where: { id_userId: { id, userId } },
        data: { parentId: targetParentId, updatedAt: nowSec },
      }).catch(() => {})
    }
    for (const id of fileIds) {
      await db.file.updateMany({
        where: { id, userId },
        data: { parentId: targetParentId, updatedAt: nowSec },
      })
    }

    revalidatePath('/drive')
    revalidatePath(`/drive/folder/${encodeURIComponent(targetParentId)}`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/v1/drive/folder/move-bulk error:', error)
    return NextResponse.json({ error: 'Failed to move items' }, { status: 500 })
  }
}


