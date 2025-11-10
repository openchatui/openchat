import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { listFilesByParent, getRootFolderId } from '@/lib/modules/drive'

export const runtime = 'nodejs'

const Query = z.object({
  parent: z.string().optional(),
})

/**
 * @swagger
 * /api/v1/drive/file:
 *   get:
 *     tags: [Drive]
 *     summary: List files for a parent folder (or root if omitted)
 *     parameters:
 *       - in: query
 *         name: parent
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of files for the specified parent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 parentId:
 *                   type: string
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to list files
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const raw = { parent: searchParams.get('parent') || undefined }
  const parsed = Query.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  }

  const parent = parsed.data.parent
  try {
    const effectiveParentId = parent && parent.length > 0 ? parent : await getRootFolderId(session.user.id)
    const entries = await listFilesByParent(session.user.id, effectiveParentId)
    const files = entries.map(e => ({ id: e.id, name: e.name }))
    return NextResponse.json({ parentId: effectiveParentId, files })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list files' }, { status: 500 })
  }
}


