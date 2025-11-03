import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ProviderService } from '@/lib/modules/ai/providers/provider.service'
import db from '@/lib/db'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * @swagger
 * /api/v1/videos/sora2/{id}/status:
 *   get:
 *     tags: [Video Tool]
 *     summary: Get Sora 2 video job status
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Current status for the job
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: queued
 *                 progress:
 *                   type: number
 *                   example: 42
 *                 job:
 *                   type: object
 *       400:
 *         description: Missing or invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to check status
 */

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
  return null
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id?: string }> }) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: rawId } = await context.params
    const videoId = typeof rawId === 'string' && rawId.trim().length > 0 ? rawId.trim() : null
    if (!videoId) return NextResponse.json({ error: 'Missing video id' }, { status: 400 })

    const conn = await ProviderService.getConnectionForProvider('openai')
    if (!conn?.apiKey) return NextResponse.json({ error: 'OpenAI connection not configured' }, { status: 400 })
    const client = new OpenAI({ apiKey: conn.apiKey, ...(conn.baseUrl ? { baseURL: conn.baseUrl } : {}) })
    const json = await client.videos.retrieve(videoId as any).catch((e: any) => ({ error: e?.message }))
    if ((json as any)?.error) {
      return NextResponse.json({ error: 'Failed to fetch video status', details: (json as any).error }, { status: 500 })
    }

    const anyJson: any = json as any
    const status: string = (anyJson?.status || '').toString()
    const progress: number = Number.isFinite(anyJson?.progress) ? Number(anyJson.progress) : 0

    // If we've already saved the asset locally, include the local URL
    let url: string | null = null
    let fileId: string | null = null
    try {
      type Row = { id: string; filename: string; path: string | null; parentId: string | null }
      let rows: Row[] = []
      try {
        rows = await db.$queryRaw<Row[]>`
          SELECT id, filename, path, parent_id as parentId
          FROM "file"
          WHERE user_id = ${userId}
            AND COALESCE(CAST(json_extract(meta, '$.jobId') AS TEXT), '') = ${videoId}
          LIMIT 1`
      } catch {
        rows = await db.$queryRaw<Row[]>`
          SELECT id, filename, path, parent_id as parentId
          FROM "file"
          WHERE user_id = ${userId}
            AND COALESCE((meta ->> 'jobId')::text, '') = ${videoId}
          LIMIT 1`
      }
      const file = rows && rows[0]
      if (file) {
        let rel = ''
        const p = file.path ? String(file.path) : ''
        if (p) {
          let normalized = p.replace(/^\/+/, '')
          if (!normalized.endsWith('/' + file.filename)) {
            normalized = normalized + '/' + file.filename
          }
          if (normalized.startsWith('data/files/')) {
            normalized = normalized.slice('data/'.length)
          }
          rel = normalized
        } else if (file.parentId) {
          rel = `files/${file.parentId}/${file.filename}`
        } else {
          rel = `files/${file.filename}`
        }
        url = rel.startsWith('files/') ? `/${rel}` : `/files/${rel}`
        fileId = file.id
      }
    } catch {}

    return NextResponse.json({ status, progress, job: json, ...(url ? { url, fileId } : {}) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}


