import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getGoogleDriveFileStream } from '@/lib/modules/drive/providers/google-drive.service'
import { Readable } from 'stream'

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

    const { stream, mimeType, size } = await getGoogleDriveFileStream(
      session.user.id,
      fileId
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

