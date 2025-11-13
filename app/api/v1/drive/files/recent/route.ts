import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { listRecentFiles } from '@/lib/db/drive.db'

export const runtime = 'nodejs'

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

/**
 * @swagger
 * /api/v1/drive/files/recent:
 *   get:
 *     tags: [Drive]
 *     summary: List recently edited files (current user)
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *     responses:
 *       200:
 *         description: List of recent files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
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
 *       500:
 *         description: Failed to list recent files
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const raw = { limit: searchParams.get('limit') || undefined }
  const parsed = Query.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  const { limit } = parsed.data

  try {
    const files = await listRecentFiles(session.user.id, limit ?? 5)
    return NextResponse.json({ files })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list recent files' }, { status: 500 })
  }
}


