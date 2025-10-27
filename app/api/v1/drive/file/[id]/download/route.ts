import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getGoogleDriveFileStream } from '@/lib/modules/drive/providers/google-drive.service'
import { Readable } from 'stream'
import db from '@/lib/db'

/**
 * @swagger
 * /api/v1/drive/file/{id}/download:
 *   get:
 *     tags: [Drive]
 *     summary: Download a Google Drive file
 *     description: Returns file bytes as an attachment. If the file is shared and not directly downloadable, returns a Drive link with 403.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File bytes
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Shared file requires Drive link
 *       500:
 *         description: Failed to download file
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId } = await params

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }

    // Get file metadata from database to get the filename
    const file = await db.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id
      },
      select: {
        filename: true,
        meta: true
      }
    })

    // Try to get file from Google Drive
    let stream: NodeJS.ReadableStream
    let mimeType: string
    let size: number | undefined
    let filename: string

    try {
      const result = await getGoogleDriveFileStream(session.user.id, fileId)
      stream = result.stream
      mimeType = result.mimeType
      size = result.size
      filename = file?.filename || 'download'
    } catch (error: any) {
      // If file is shared with me and not accessible via API, return error with Drive link
      if (file && file.meta && typeof file.meta === 'object') {
        const meta = file.meta as any
        if (meta.webViewLink && meta.ownedByMe === false) {
          return NextResponse.json(
            { 
              error: 'This file is shared with you and cannot be downloaded directly. Please access it via Google Drive.',
              driveUrl: meta.webViewLink 
            },
            { status: 403 }
          )
        }
      }
      throw error
    }

    // Convert Node.js stream to Web ReadableStream
    const webStream = Readable.toWeb(stream as any) as ReadableStream

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename).replace(/'/g, "%27")}"`,
      'Cache-Control': 'no-cache',
    }

    if (size) {
      headers['Content-Length'] = size.toString()
    }

    return new NextResponse(webStream, {
      headers,
    })
  } catch (error: any) {
    console.error('Error downloading Google Drive file:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to download file' },
      { status: 500 }
    )
  }
}


