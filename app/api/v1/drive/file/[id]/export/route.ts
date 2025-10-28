import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { 
  exportGoogleDriveFile, 
  isGoogleWorkspaceFile,
  getExportMimeType
} from '@/lib/modules/drive/providers/google-drive.service'
import { Readable } from 'stream'
import db from '@/lib/db'

/**
 * @swagger
 * /api/v1/drive/file/{id}/export:
 *   get:
 *     tags: [Drive]
 *     summary: Export a Google Workspace file to a downloadable format
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Exported file stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid file type for export
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 *       500:
 *         description: Failed to export file
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

    // Get file metadata from database to determine mime type
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

    if (!file || !file.meta || typeof file.meta !== 'object') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const meta = file.meta as any
    const originalMimeType = meta.mimeType

    if (!originalMimeType || !isGoogleWorkspaceFile(originalMimeType)) {
      return NextResponse.json(
        { error: 'This endpoint is only for Google Workspace files' },
        { status: 400 }
      )
    }

    const exportMimeType = getExportMimeType(originalMimeType)
    if (!exportMimeType) {
      return NextResponse.json(
        { error: 'Cannot export this file type' },
        { status: 400 }
      )
    }

    const { stream, mimeType } = await exportGoogleDriveFile(
      session.user.id,
      fileId,
      exportMimeType
    )

    // Convert Node.js stream to Web ReadableStream
    const webStream = Readable.toWeb(stream as any) as ReadableStream

    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600',
    }

    return new NextResponse(webStream, {
      headers,
    })
  } catch (error: any) {
    console.error('Error exporting Google Drive file:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to export file' },
      { status: 500 }
    )
  }
}


