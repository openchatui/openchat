import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import db from '@/lib/db'
import { getRootFolderId } from '@/lib/modules/drive'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * @swagger
 * /api/v1/chat/attachments:
 *   post:
 *     tags: [Chat]
 *     summary: Upload a file attachment for chat messages
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 fileId:
 *                   type: string
 *                 filename:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Upload failed
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[DEBUG] Chat attachment upload received')
    const session = await auth()
    const userId = session?.user?.id
    console.log('[DEBUG] Auth check:', { hasSession: !!session, userId })
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    console.log('[DEBUG] FormData parsed, has file:', !!file)

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    console.log('[DEBUG] File info:', { name: file.name, size: file.size, type: file.type })

    // Validate file size (max 20MB for chat attachments)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const maxBytes = 20 * 1024 * 1024
    if (buffer.length > maxBytes) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })
    }

    const fileId = randomUUID()
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    
    // Get root folder ID
    const rootFolderId = await getRootFolderId(userId)
    
    // Save to data/files/{rootFolderId}/
    const dataDir = path.join(process.cwd(), 'data', 'files', rootFolderId)
    await mkdir(dataDir, { recursive: true })
    
    const filename = `${Date.now()}-${sanitizedName}`
    const filePath = path.join(dataDir, filename)
    await writeFile(filePath, buffer)
    
    console.log('[DEBUG] File saved to:', filePath)

    // Save to database
    const nowSec = Math.floor(Date.now() / 1000)
    await db.file.create({
      data: {
        id: fileId,
        userId,
        filename,
        parentId: rootFolderId,
        meta: { originalName: file.name, mimeType: file.type },
        createdAt: nowSec,
        updatedAt: nowSec,
        path: `/data/files/${rootFolderId}/${filename}`,
      },
    })

    console.log('[DEBUG] File saved to DB:', fileId)

    return NextResponse.json({ ok: true, fileId, filename })
  } catch (error) {
    console.error('[ERROR] POST /api/v1/chat/attachments error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

