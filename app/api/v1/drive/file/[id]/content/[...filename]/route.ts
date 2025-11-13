import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { Readable } from 'stream'
import { getGoogleDriveFileStream } from '@/lib/modules/drive/providers/google-drive.service'
import { verify } from 'jsonwebtoken'
import { readFile } from 'fs/promises'
import path from 'path'

function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'json': 'application/json',
    'xml': 'text/xml',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

/**
 * @swagger
 * /api/v1/drive/file/{id}/content/{filename}:
 *   get:
 *     tags: [Drive]
 *     summary: Stream a Google Drive file (supports signed URLs)
 *     description: |
 *       Streams the raw bytes of a Google Drive file. Authenticated users can access their own files directly.
 *       For external consumers (e.g., AI model web fetch), provide a `token` query param containing a short-lived signed token.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: filename
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional filename for pretty URLs; ignored by server.
 *       - in: query
 *         name: token
 *         required: false
 *         schema:
 *           type: string
 *         description: Signed access token for cookie-less access (e.g., external fetchers).
 *     responses:
 *       200:
 *         description: File stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 *       500:
 *         description: Failed to fetch file
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; filename?: string[] }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }

    const url = new URL(req.url)
    const tokenParam = url.searchParams.get('token')

    let userId: string | null = null

    if (tokenParam) {
      // Verify signed token for cookie-less access
      const secret = process.env.TOKEN_SECRET || process.env.AUTH_SECRET || ''
      try {
        const decoded = verify(tokenParam, secret) as { sub?: string; userId?: string }
        if (!decoded || (decoded.sub !== id && decoded.userId == null)) {
          return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }
        // Prefer explicit userId from token; otherwise resolve from DB by id
        userId = decoded.userId ?? null
      } catch (err) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
      }
    }

    if (!userId) {
      // Fallback to session auth
      const session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = session.user.id
    }

    // If userId still not known (token without userId), try resolving owner from DB
    if (!userId) {
      const fileRow = await db.file.findFirst({ where: { id }, select: { userId: true } })
      if (!fileRow?.userId) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
      userId = fileRow.userId
    }

    // Check if file is stored locally or in Google Drive
    const fileRecord = await db.file.findFirst({ 
      where: { id, userId }, 
      select: { path: true, filename: true, meta: true } 
    })
    
    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // If path starts with /data/files/, it's a local file
    if (fileRecord.path && fileRecord.path.startsWith('/data/files/')) {
      const localPath = path.join(process.cwd(), fileRecord.path)
      
      try {
        const buffer = await readFile(localPath)
        
        // Determine mime type
        const mimeType = (fileRecord.meta as any)?.mimeType || 
                        getMimeTypeFromFilename(fileRecord.filename) || 
                        'application/octet-stream'
        
        const headers: Record<string, string> = {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Content-Length': buffer.length.toString()
        }
        
        // Stream the buffer as a Web ReadableStream (widely accepted BodyInit)
        const nodeStream = Readable.from(buffer)
        const webStream = Readable.toWeb(nodeStream) as ReadableStream
        return new NextResponse(webStream, { headers })
      } catch (err) {
        console.error('Error reading local file:', err)
        return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
      }
    }

    // Otherwise, fetch from Google Drive
    const { stream, mimeType, size } = await getGoogleDriveFileStream(userId, id)

    const webStream = Readable.toWeb(stream as any) as ReadableStream

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    }

    if (size) headers['Content-Length'] = size.toString()

    return new NextResponse(webStream, { headers })
  } catch (error: any) {
    console.error('Error streaming Drive file (content):', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to fetch file' },
      { status: 500 }
    )
  }
}


