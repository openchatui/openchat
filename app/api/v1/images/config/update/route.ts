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

const ImageProvider = z.enum(['openai', 'comfyui', 'automatic1111'])
const OpenAIConfig = z.object({
  baseUrl: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  size: z.string().min(1).optional(),
  quality: z.string().min(1).optional(),
  style: z.string().min(1).optional(),
})
const BodySchema = z.object({
  image: z.object({
    provider: ImageProvider.optional(),
    openai: OpenAIConfig.optional(),
  })
})

/**
 * @swagger
 * /api/v1/images/config/update:
 *   put:
 *     tags: [Admin]
 *     summary: Update image configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: object
 *                 properties:
 *                   provider:
 *                     type: string
 *                     enum: [openai, comfyui, automatic1111]
 *                   openai:
 *                     type: object
 *                     properties:
 *                       baseUrl:
 *                         type: string
 *                       apiKey:
 *                         type: string
 *                       model:
 *                         type: string
 *                       size:
 *                         type: string
 *                       quality:
 *                         type: string
 *                       style:
 *                         type: string
 *     responses:
 *       200:
 *         description: Updated subset of image config
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Failed to update image config
 */
export async function PUT(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}))
    const input = BodySchema.safeParse(raw)
    if (!input.success) {
      return NextResponse.json({ error: 'Invalid image payload' }, { status: 400 })
    }

    const incoming = input.data.image

    const existing = await db.config.findUnique({ where: { id: 1 } })
    const currentData = (existing?.data || {}) as Record<string, unknown>
    const currentImage = isPlainObject((currentData as any).image) ? (currentData as any).image : {}

    // Translate camelCase openai fields to stored snake_case
    const normalizedIncoming: any = { ...incoming }
    if (isPlainObject(incoming.openai)) {
      const src = incoming.openai as any
      normalizedIncoming.openai = {
        ...(isPlainObject((currentImage as any).openai) ? (currentImage as any).openai : {}),
        ...(typeof src.baseUrl === 'string' ? { base_url: src.baseUrl } : {}),
        ...(typeof src.apiKey === 'string' ? { api_key: src.apiKey } : {}),
        ...(typeof src.model === 'string' ? { model: src.model } : {}),
        ...(typeof src.size === 'string' ? { size: src.size } : {}),
        ...(typeof src.quality === 'string' ? { quality: src.quality } : {}),
        ...(typeof src.style === 'string' ? { style: src.style } : {}),
      }
    }

    const mergedImage = deepMerge(currentImage, normalizedIncoming)
    const nextData = { ...currentData, image: mergedImage }

    const result = existing
      ? await db.config.update({ where: { id: 1 }, data: { data: nextData } })
      : await db.config.create({ data: { id: 1, data: nextData } })

    const data = result.data as any
    const image = isPlainObject(data.image) ? (data.image as any) : {}
    return NextResponse.json({
      image: {
        provider: (typeof image.provider === 'string' ? image.provider : 'openai') as 'openai' | 'comfyui' | 'automatic1111',
      }
    })
  } catch (error) {
    console.error('PUT /api/v1/images/config/update error:', error)
    return NextResponse.json({ error: 'Failed to update image config' }, { status: 500 })
  }
}


