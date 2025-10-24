import { NextResponse } from 'next/server'
import db from '@/lib/db'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * @swagger
 * /api/v1/videos/config:
 *   get:
 *     tags: [Admin]
 *     summary: Get video configuration
 *     responses:
 *       200:
 *         description: Current video configuration
 *       500:
 *         description: Failed to fetch video config
 */
export async function GET() {
  try {
    let config = await db.config.findUnique({ where: { id: 1 } })
    if (!config) {
      config = await db.config.create({ data: { id: 1, data: {} } })
    }

    const data = (config.data || {}) as any
    const video = isPlainObject(data.video) ? (data.video as any) : {}

    const enabled = Boolean(video.enabled)
    const provider = (typeof video.provider === 'string' ? video.provider : 'openai') as 'openai'
    const openai = isPlainObject(video.openai) ? (video.openai as any) : {}

    return NextResponse.json({
      video: {
        enabled,
        provider,
        openai: {
          model: typeof openai.model === 'string' ? openai.model : 'sora-2-pro',
          size: typeof openai.size === 'string' ? openai.size : '1280x720',
          seconds: Number.isFinite(openai.seconds) ? Number(openai.seconds) : 4,
        },
      },
    })
  } catch (error) {
    console.error('GET /api/v1/videos/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch video config' }, { status: 500 })
  }
}


