import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'
import { ProviderService } from '@/lib/modules/ai/providers/provider.service'
import { getRootFolderId } from '@/lib/modules/drive'
import { LOCAL_BASE_DIR } from '@/lib/modules/drive/providers/local.service'
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
  // Common shapes observed/expected
  if (json.assets && typeof json.assets === 'object') {
    if (typeof json.assets.video === 'string' && json.assets.video) return json.assets.video
    if (Array.isArray(json.assets) && json.assets.length > 0) {
      const first = json.assets.find((a: any) => typeof a?.video === 'string')
      if (first?.video) return String(first.video)
    }
  }
  if (typeof json.url === 'string' && json.url) return json.url
  if (json.data && Array.isArray(json.data) && json.data[0]?.url) return String(json.data[0].url)
  // OpenAI-style content blocks
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

async function getOpenAIConnection(): Promise<{ baseUrl: string; apiKey: string } | null> {
  const conn = await ProviderService.getConnectionForProvider('openai')
  if (!conn?.apiKey) return null
  const baseUrl = (conn.baseUrl && conn.baseUrl.trim().length > 0) ? conn.baseUrl.trim().replace(/\/$/, '') : 'https://api.openai.com/v1'
  return { baseUrl, apiKey: conn.apiKey }
}

/**
 * @swagger
 * /api/v1/videos/sora2:
 *   post:
 *     tags: [Tools]
 *     summary: Generate a video using Sora 2 (OpenAI Videos API)
 *     description: Proxies to OpenAI Videos API (model sora-2-pro), downloads the resulting video, saves it locally, and inserts a record into the file table.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *               size:
 *                 type: string
 *                 example: 1280x720
 *               seconds:
 *                 type: integer
 *                 example: 4
 *               parent:
 *                 type: string
 *                 description: Optional destination folder id
 *               input_reference:
 *                 type: string
 *                 format: binary
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
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Gather input from form-data or JSON
    let prompt: string | null = null
    let size: string | null = null
    let seconds: number = 4
    let parentId: string | null = null
    let inputRef: File | null = null

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      prompt = getString(form.get('prompt'))
      size = getString(form.get('size')) || '1280x720'
      seconds = tryParseInt(form.get('seconds'), 4)
      parentId = getString(form.get('parent'))
      const maybeFile = form.get('input_reference')
      inputRef = (maybeFile instanceof File) ? maybeFile : null
    } else {
      const body = await request.json().catch(() => ({}))
      prompt = getString((body as any).prompt)
      size = getString((body as any).size) || '1280x720'
      seconds = tryParseInt((body as any).seconds, 4)
      parentId = getString((body as any).parent)
    }

    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })

    const conn = await getOpenAIConnection()
    if (!conn) return NextResponse.json({ error: 'OpenAI connection not configured' }, { status: 400 })

    const upstream = new FormData()
    upstream.append('model', 'sora-2-pro')
    upstream.append('prompt', prompt)
    if (size) upstream.append('size', size)
    upstream.append('seconds', String(seconds))
    if (inputRef) {
      upstream.append('input_reference', inputRef, (inputRef as any).name || 'reference.jpg')
    }

    const res = await fetch(`${conn.baseUrl}/videos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${conn.apiKey}` },
      body: upstream,
    })

    const text = await res.text().catch(() => '')
    let json: any = null
    try { json = text ? JSON.parse(text) : null } catch { json = null }
    if (!res.ok) {
      return NextResponse.json({ error: 'OpenAI video create failed', details: text?.slice(0, 2000) }, { status: res.status })
    }

    // If a downloadable URL is present, fetch and store the asset
    const videoUrl = extractVideoUrl(json)
    if (!videoUrl) {
      return NextResponse.json({ accepted: true, job: json }, { status: 202 })
    }

    const assetRes = await fetch(videoUrl, { headers: { Authorization: `Bearer ${conn.apiKey}` } })
    if (!assetRes.ok) {
      return NextResponse.json({ error: 'Failed to download video asset', details: await assetRes.text().catch(() => '') }, { status: 502 })
    }

    const arrayBuf = await assetRes.arrayBuffer()
    const buf = Buffer.from(arrayBuf)
    const ext = pickContentExt(assetRes.headers.get('content-type'))

    // Resolve target folder and path
    const effectiveParentId = parentId && parentId.length > 0 ? parentId : await getRootFolderId(userId)
    const parentDir = path.join(LOCAL_BASE_DIR, effectiveParentId)
    await mkdir(parentDir, { recursive: true })

    const baseName = `sora-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`
    let finalPath = path.join(parentDir, baseName)

    await writeFile(finalPath, buf)

    // Compute hash
    const sha = createHash('sha256').update(buf).digest('hex')

    // Insert into file table
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
        meta: { provider: 'openai', model: 'sora-2-pro', prompt, size, seconds, sourceUrl: videoUrl },
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
    console.error('POST /api/v1/videos/sora2 error:', error)
    return NextResponse.json({ error: 'Failed to generate video' }, { status: 500 })
  }
}


