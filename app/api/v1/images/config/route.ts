import { NextResponse } from 'next/server'
import db from '@/lib/db'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * @swagger
 * /api/v1/images/config:
 *   get:
 *     tags: [Admin]
 *     summary: Get image configuration
 *     responses:
 *       200:
 *         description: Current image configuration
 *       500:
 *         description: Failed to fetch image config
 */
export async function GET() {
  try {
    let config = await db.config.findUnique({ where: { id: 1 } })
    if (!config) {
      config = await db.config.create({ data: { id: 1, data: {} } })
    }

    const data = (config.data || {}) as any
    const image = isPlainObject(data.image) ? (data.image as any) : {}
    const provider = (typeof image.provider === 'string' && ['openai','comfyui','automatic1111'].includes(String(image.provider).toLowerCase()))
      ? (String(image.provider).toLowerCase())
      : 'openai'
    const openai = isPlainObject(image.openai) ? (image.openai as any) : {}

    return NextResponse.json({
      image: {
        provider: provider as 'openai' | 'comfyui' | 'automatic1111',
        openai: {
          baseUrl: typeof openai.base_url === 'string' ? openai.base_url : '',
          apiKey: typeof openai.api_key === 'string' ? openai.api_key : '',
          model: typeof openai.model === 'string' ? openai.model : 'gpt-image-1',
          size: typeof openai.size === 'string' ? openai.size : '1024x1024',
          quality: typeof openai.quality === 'string' ? openai.quality : undefined,
          style: typeof openai.style === 'string' ? openai.style : undefined,
        },
      }
    })
  } catch (error) {
    console.error('GET /api/v1/images/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch image config' }, { status: 500 })
  }
}


