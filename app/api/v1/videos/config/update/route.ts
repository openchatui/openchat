import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import db from '@/lib/db'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge(target: any, source: any): any {
  if (Array.isArray(target) && Array.isArray(source)) return source
  if (isPlainObject(target) && isPlainObject(source)) {
    const result: Record<string, unknown> = { ...target }
    for (const key of Object.keys(source)) {
      const sVal = (source as any)[key]
      const tVal = (target as any)[key]
      result[key] = isPlainObject(tVal) && isPlainObject(sVal) ? deepMerge(tVal, sVal) : sVal
    }
    return result
  }
  return source
}

const VideoProvider = z.enum(['openai'])
const OpenAIConfig = z.object({
  model: z.string().min(1).optional(),
  size: z.string().min(1).optional(),
  seconds: z.number().int().min(1).max(600).optional(),
})
const BodySchema = z.object({
  video: z.object({
    enabled: z.boolean().optional(),
    provider: VideoProvider.optional(),
    openai: OpenAIConfig.optional(),
  })
})

/**
 * @swagger
 * /api/v1/videos/config/update:
 *   put:
 *     tags: [Admin]
 *     summary: Update video configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   provider:
 *                     type: string
 *                     enum: [openai]
 *                   openai:
 *                     type: object
 *                     properties:
 *                       model:
 *                         type: string
 *                       size:
 *                         type: string
 *                       seconds:
 *                         type: integer
 *     responses:
 *       200:
 *         description: Updated subset of video config
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Failed to update video config
 */
export async function PUT(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}))
    const input = BodySchema.safeParse(raw)
    if (!input.success) {
      return NextResponse.json({ error: 'Invalid video payload' }, { status: 400 })
    }

    const incoming = input.data.video

    const existing = await db.config.findUnique({ where: { id: 1 } })
    const currentData = (existing?.data || {}) as Record<string, unknown>
    const currentVideo = isPlainObject((currentData as any).video) ? (currentData as any).video : {}

    const mergedVideo = deepMerge(currentVideo, incoming)
    const nextData = { ...currentData, video: mergedVideo }

    const result = existing
      ? await db.config.update({ where: { id: 1 }, data: { data: nextData } })
      : await db.config.create({ data: { id: 1, data: nextData } })

    const data = result.data as any
    const video = isPlainObject(data.video) ? (data.video as any) : {}
    return NextResponse.json({
      video: {
        enabled: Boolean(video.enabled),
        provider: (typeof video.provider === 'string' ? video.provider : 'openai') as 'openai',
      }
    })
  } catch (error) {
    console.error('PUT /api/v1/videos/config/update error:', error)
    return NextResponse.json({ error: 'Failed to update video config' }, { status: 500 })
  }
}


