import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ProviderService } from '@/lib/modules/ai/providers/provider.service'
import OpenAI from 'openai'
import { createUserFileRecord } from '@/lib/db/video.db'
import { getRootFolderId } from '@/lib/modules/drive'
import { LOCAL_BASE_DIR } from '@/lib/modules/drive/providers/local.service'
import { mkdir, writeFile, rename } from 'fs/promises'
import path from 'path'
import { randomUUID, createHash } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function pickExtFromType(contentType: string | null | undefined): string {
  const ct = String(contentType || '').toLowerCase()
  if (ct.includes('webm')) return 'webm'
  if (ct.includes('quicktime') || ct.includes('mov')) return 'mov'
  if (ct.includes('m4v')) return 'm4v'
  if (ct.includes('mp4')) return 'mp4'
  return 'bin'
}

async function getOpenAIClient(): Promise<OpenAI | null> {
  const conn = await ProviderService.getConnectionForProvider('openai')
  if (!conn?.apiKey) return null
  return new OpenAI({ apiKey: conn.apiKey, ...(conn.baseUrl ? { baseURL: conn.baseUrl } : {}) })
}

/**
 * @swagger
 * /api/v1/videos/sora2/{id}:
 *   get:
 *     tags: [Tools]
 *     summary: Download Sora 2 video bytes (proxy)
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Video file bytes
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Missing id
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to download video
 */
// GET /api/v1/videos/sora2/:id - Proxy download of video bytes
export async function GET(_req: NextRequest, context: { params: Promise<{ id?: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

    const { id: rawId } = await context.params
    const videoId = (typeof rawId === 'string' && rawId.trim().length > 0) ? rawId.trim() : null
    if (!videoId) return new NextResponse('Missing id', { status: 400 })

    const client = await getOpenAIClient()
    if (!client) return NextResponse.json({ error: 'OpenAI connection not configured' }, { status: 400 })

    const res = await client.videos.downloadContent(videoId as any)
    const type = res.headers.get('content-type') || 'application/octet-stream'
    const ext = pickExtFromType(type)
    const length = res.headers.get('content-length') || undefined
    const body = res.body as any // ReadableStream

    return new NextResponse(body, {
      status: 200,
      headers: {
        'content-type': type,
        ...(length ? { 'content-length': length } : {}),
        'content-disposition': `attachment; filename="${videoId}.${ext}"`,
        'cache-control': 'no-store',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to download video', details: e?.message || String(e) }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/v1/videos/sora2/{id}:
 *   post:
 *     tags: [Tools]
 *     summary: Finalize Sora 2 video by downloading and saving locally
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Video downloaded and saved locally
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 fileId:
 *                   type: string
 *       400:
 *         description: Missing id
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to finalize video
 */
// POST /api/v1/videos/sora2/:id - Finalize: download and persist locally, return local URL
export async function POST(_req: NextRequest, context: { params: Promise<{ id?: string }> }) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: rawId } = await context.params
    const videoId = (typeof rawId === 'string' && rawId.trim().length > 0) ? rawId.trim() : null
    if (!videoId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const client = await getOpenAIClient()
    if (!client) return NextResponse.json({ error: 'OpenAI connection not configured' }, { status: 400 })

    const downloadRes = await client.videos.downloadContent(videoId as any)
    const contentType = downloadRes.headers.get('content-type')
    const arrayBuf = await downloadRes.arrayBuffer()
    const buf = Buffer.from(arrayBuf)
    const ext = pickExtFromType(contentType)

    const effectiveParentId = await getRootFolderId(userId)
    const targetDir = path.join(LOCAL_BASE_DIR, effectiveParentId, videoId)
    await mkdir(targetDir, { recursive: true })

    const filename = `video.${ext}`
    const tempPath = path.join(targetDir, `${filename}.part`)
    const finalPath = path.join(targetDir, filename)
    await writeFile(tempPath, buf)
    await rename(tempPath, finalPath)

    const sha = createHash('sha256').update(buf).digest('hex')
    const id = randomUUID()
    const nowSec = Math.floor(Date.now() / 1000)
    const dbPath = `/data/files/${effectiveParentId}/${videoId}`

    await createUserFileRecord({
      id,
      userId,
      parentId: effectiveParentId,
      filename,
      dbPath,
      createdAt: nowSec,
      updatedAt: nowSec,
      hash: sha,
      meta: { provider: 'openai', jobId: videoId } as Record<string, unknown>,
      data: {},
    })

    const url = `/files/${effectiveParentId}/${videoId}/${filename}`
    return NextResponse.json({ url, fileId: id })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to finalize video', details: e?.message || String(e) }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/v1/videos/sora2/{id}:
 *   delete:
 *     tags: [Tools]
 *     summary: Delete Sora 2 video remotely
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Deletion result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *       400:
 *         description: Missing id
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to delete video
 */
// DELETE /api/v1/videos/sora2/:id - Delete remote video
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id?: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

    const { id: rawId } = await context.params
    const videoId = (typeof rawId === 'string' && rawId.trim().length > 0) ? rawId.trim() : null
    if (!videoId) return new NextResponse('Missing id', { status: 400 })

    const client = await getOpenAIClient()
    if (!client) return NextResponse.json({ error: 'OpenAI connection not configured' }, { status: 400 })

    const resp: any = await client.videos.delete(videoId as any)
    return NextResponse.json({ ok: true, id: resp?.id || videoId, status: resp?.status || 'deleted' })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to delete video', details: e?.message || String(e) }, { status: 500 })
  }
}


