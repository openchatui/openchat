import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { searchFilesByName } from '@/lib/db/drive.db'

export const runtime = 'nodejs'

const Query = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

/**
 * @swagger
 * /api/v1/drive/files/search:
 *   get:
 *     tags: [Drive]
 *     summary: Search files by name (current user)
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *     responses:
 *       200:
 *         description: List of matching files
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
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to search files
 */
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const raw = { q: searchParams.get('q') || '', limit: searchParams.get('limit') || undefined }
  const parsed = Query.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  const { q, limit } = parsed.data

  try {
    const files = await searchFilesByName(session.user.id, q, limit ?? 10)
    return NextResponse.json({ files })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to search files' }, { status: 500 })
  }
}



