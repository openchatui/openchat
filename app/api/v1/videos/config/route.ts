import { NextResponse } from 'next/server'
import { getVideoConfigData } from '@/lib/db/video.db'

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 video:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                     provider:
 *                       type: string
 *                       enum: [openai]
 *                     openai:
 *                       type: object
 *                       properties:
 *                         model: { type: string }
 *                         size: { type: string }
 *                         seconds: { type: integer }
 *       500:
 *         description: Failed to fetch video config
 */
export async function GET() {
  try {
    const data = (await getVideoConfigData()) as any
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


