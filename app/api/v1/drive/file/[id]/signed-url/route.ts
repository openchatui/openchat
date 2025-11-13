import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { sign } from 'jsonwebtoken'

interface BodyInput {
  filename?: string
  ttlSec?: number
}

/**
 * @swagger
 * /api/v1/drive/file/{id}/signed-url:
 *   post:
 *     tags: [Drive]
 *     summary: Create a short-lived signed URL for streaming a Drive file
 *     description: Returns a URL that streams the file via `/content/{filename}?token=...` for cookie-less access (e.g., AI model fetch).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Optional filename to include in the URL path.
 *               ttlSec:
 *                 type: integer
 *                 description: Time-to-live in seconds (default 3600, max 86400).
 *     responses:
 *       200:
 *         description: Signed URL generated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'File ID required' }, { status: 400 })

    // Ensure the file belongs to the current user
    const file = await db.file.findFirst({ where: { id, userId: session.user.id }, select: { filename: true } })
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const body = (await req.json().catch(() => ({}))) as BodyInput
    const rawTtl = typeof body.ttlSec === 'number' ? body.ttlSec : 3600
    const ttlSec = Math.min(Math.max(rawTtl, 60), 86400)
    const name = (body.filename && typeof body.filename === 'string') ? body.filename : file.filename

    const secret = process.env.TOKEN_SECRET || process.env.AUTH_SECRET || ''
    if (!secret) return NextResponse.json({ error: 'Server secret not configured' }, { status: 500 })

    const token = sign({ sub: id, userId: session.user.id }, secret, { expiresIn: ttlSec })

    const base = new URL(req.url)
    // Construct content URL: /api/v1/drive/file/{id}/content/{filename}?token=...
    const filename = encodeURIComponent(name)
    const contentPath = `/api/v1/drive/file/${encodeURIComponent(id)}/content/${filename}`
    const signedUrl = new URL(contentPath, `${base.protocol}//${base.host}`)
    signedUrl.searchParams.set('token', token)

    return NextResponse.json({ url: signedUrl.toString(), expiresIn: ttlSec })
  } catch (error) {
    console.error('POST /api/v1/drive/file/{id}/signed-url error:', error)
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }
}


