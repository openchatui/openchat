import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getGoogleDriveFileStream } from '@/lib/modules/drive/providers/google-drive.service'
import { Readable } from 'stream'
import db from '@/lib/db'

/**
 * @swagger
 * /api/v1/drive/file/{id}:
 *   get:
 *     tags: [Drive]
 *     summary: Stream a Google Drive file for the authenticated user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: File ID required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch file
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }

    // Check if file is stored locally or in Google Drive
    const fileRecord = await db.file.findFirst({ 
      where: { id, userId: session.user.id }, 
      select: { path: true, filename: true, meta: true } 
    })
    
    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // If path starts with /data/files/, it's a local file
    if (fileRecord.path && fileRecord.path.startsWith('/data/files/')) {
      const { readFile } = await import('fs/promises')
      const path = await import('path')
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
          'Content-Length': buffer.length.toString()
        }
        
        return new NextResponse(new Uint8Array(buffer), { headers })
      } catch (err) {
        console.error('Error reading local file:', err)
        return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
      }
    }

    // Otherwise, fetch from Google Drive
    const { stream, mimeType, size } = await getGoogleDriveFileStream(
      session.user.id,
      id
    )

    // Convert Node.js stream to Web ReadableStream
    const webStream = Readable.toWeb(stream as any) as ReadableStream

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600',
    }

    if (size) {
      headers['Content-Length'] = size.toString()
    }

    return new NextResponse(webStream, {
      headers,
    })
  } catch (error: any) {
    console.error('Error fetching Google Drive file:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to fetch file' },
      { status: 500 }
    )
  }
}

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

