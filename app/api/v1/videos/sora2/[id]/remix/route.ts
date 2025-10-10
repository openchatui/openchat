import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { ProviderService } from '@/lib/features/ai/providers/provider.service'
import OpenAI from 'openai'
import { getRootFolderId } from '@/lib/server/drive'
import { LOCAL_BASE_DIR } from '@/lib/server/drive/providers/local.service'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID, createHash } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getString(val: unknown): string | null {
  if (val === null || val === undefined) return null
  const s = String(val)
  return s.trim().length > 0 ? s.trim() : null
}

function tryParseInt(val: unknown, fallback: number): number {
  const n = Number(val)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function pickContentExt(contentType: string | null | undefined): string {
  const ct = String(contentType || '').toLowerCase()
  if (ct.includes('webm')) return 'webm'
  if (ct.includes('quicktime') || ct.includes('mov')) return 'mov'
  if (ct.includes('m4v')) return 'm4v'
  return 'mp4'
}

function extractVideoUrl(json: any): string | null {
  if (!json || typeof json !== 'object') return null
  if (json.assets && typeof json.assets === 'object') {
    if (typeof json.assets.video === 'string' && json.assets.video) return json.assets.video
    if (Array.isArray(json.assets) && json.assets.length > 0) {
      const first = json.assets.find((a: any) => typeof a?.video === 'string')
      if (first?.video) return String(first.video)
    }
  }
  if (typeof json.url === 'string' && json.url) return json.url
  if (json.data && Array.isArray(json.data) && json.data[0]?.url) return String(json.data[0].url)
  const maybeContent = json.output || json.contents || json.content
  const arr = Array.isArray(maybeContent) ? maybeContent : []
  for (const item of arr) {
    const blocks = Array.isArray(item?.content) ? item.content : []
    for (const b of blocks) {
      if (b?.type === 'output_video' && typeof b?.video?.url === 'string') return b.video.url
      if (b?.type === 'video' && typeof b?.video?.url === 'string') return b.video.url
      if (typeof b?.url === 'string') return b.url
    }
  }
  return null
}

async function getOpenAIClient(): Promise<OpenAI | null> {
  const conn = await ProviderService.getConnectionForProvider('openai')
  if (!conn?.apiKey) return null
  return new OpenAI({ apiKey: conn.apiKey, ...(conn.baseUrl ? { baseURL: conn.baseUrl } : {}) })
}

/**
 * @swagger
 * /api/v1/videos/sora2/{id}/remix:
 *   post:
 *     tags: [Tools]
 *     summary: Remix an existing OpenAI video by id using Sora 2
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *               size:
 *                 type: string
 *               seconds:
 *                 type: integer
 *               parent:
 *                 type: string
 *     responses:
 *       200:
 *         description: Video stored and recorded
 *       202:
 *         description: Video job accepted (no downloadable asset yet)
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id?: string }> }) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: rawId } = await context.params
    const videoId = getString(rawId)
    if (!videoId) return NextResponse.json({ error: 'Missing video id' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const prompt = getString((body as any).prompt)
    const size = getString((body as any).size)
    const seconds = tryParseInt((body as any).seconds, 0)
    const parentId = getString((body as any).parent)
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

    const client = await getOpenAIClient()
    if (!client) return NextResponse.json({ error: 'OpenAI connection not configured' }, { status: 400 })

    const payload: Record<string, any> = { prompt }
    if (size) payload.size = size
    if (seconds && seconds > 0) payload.seconds = String(seconds)

    const json: any = await client.videos.remix(videoId as any, payload as any)
    const jobId = typeof json?.id === 'string' ? json.id : null
    const status = typeof json?.status === 'string' ? json.status : ''
    if (!jobId || (status && status !== 'completed' && status !== 'ready')) {
      return NextResponse.json({ accepted: true, job: json }, { status: 202 })
    }

    const downloadRes = await client.videos.downloadContent(jobId as any)
    const contentType = downloadRes.headers.get('content-type')
    const arrayBuf = await downloadRes.arrayBuffer()
    const buf = Buffer.from(arrayBuf)
    const ext = pickContentExt(contentType)

    const effectiveParentId = parentId && parentId.length > 0 ? parentId : await getRootFolderId(userId)
    const parentDir = path.join(LOCAL_BASE_DIR, effectiveParentId)
    await mkdir(parentDir, { recursive: true })

    const baseName = `sora-remix-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`
    let finalPath = path.join(parentDir, baseName)

    await writeFile(finalPath, buf)

    const sha = createHash('sha256').update(buf).digest('hex')
    const id = randomUUID()
    const nowSec = Math.floor(Date.now() / 1000)
    const filename = path.basename(finalPath)
    const dbPath = `/data/files/${effectiveParentId}/${filename}`

    await db.file.create({
      data: {
        id,
        userId,
        parentId: effectiveParentId,
        filename,
        meta: { provider: 'openai', model: 'sora-2-pro', prompt, size, seconds, sourceVideoId: videoId, jobId },
        createdAt: nowSec,
        updatedAt: nowSec,
        hash: sha,
        data: json,
        path: dbPath,
      },
    })

    const url = `/files/${effectiveParentId}/${filename}`
    return NextResponse.json({ id, filename, path: dbPath, url })
  } catch (error: any) {
    console.error('POST /api/v1/videos/sora2/[id]/remix error:', error)
    return NextResponse.json({ error: 'Failed to remix video' }, { status: 500 })
  }
}


