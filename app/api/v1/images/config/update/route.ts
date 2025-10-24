import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateImageConfigInDb } from '@/lib/db/image.db'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

    const incoming = input.data.image as any
    const next = await updateImageConfigInDb({
      provider: incoming.provider,
      openai: isPlainObject(incoming.openai) ? {
        baseUrl: typeof (incoming.openai as any).baseUrl === 'string' ? (incoming.openai as any).baseUrl : undefined,
        apiKey: typeof (incoming.openai as any).apiKey === 'string' ? (incoming.openai as any).apiKey : undefined,
        model: typeof (incoming.openai as any).model === 'string' ? (incoming.openai as any).model : undefined,
        size: typeof (incoming.openai as any).size === 'string' ? (incoming.openai as any).size : undefined,
        quality: typeof (incoming.openai as any).quality === 'string' ? (incoming.openai as any).quality : undefined,
        style: typeof (incoming.openai as any).style === 'string' ? (incoming.openai as any).style : undefined,
      } : undefined,
    })
    return NextResponse.json({ image: next })
  } catch (error) {
    console.error('PUT /api/v1/images/config/update error:', error)
    return NextResponse.json({ error: 'Failed to update image config' }, { status: 500 })
  }
}


