import db from '@/lib/db'
import { tool } from 'ai'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

type ImageProvider = 'openai' | 'comfyui' | 'automatic1111'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const ALLOWED_MODELS = new Set(['o3-mini', 'o4-mini', 'gpt-image-1', 'dall-e-3'])

interface ResolvedOpenAIImageConfig {
  baseUrl: string
  apiKey: string
  model: 'gpt-image-1' | 'dall-e-3'
  requestedModel?: string
  size: string
}

async function resolveOpenAIImageConfig() : Promise<ResolvedOpenAIImageConfig> {
  const cfgRow = await (db as any).config.findUnique({ where: { id: 1 } })
  const data = (cfgRow?.data || {}) as any

  const image = isPlainObject(data.image) ? (data.image as any) : {}
  const provider: ImageProvider = typeof image.provider === 'string' ? (image.provider as ImageProvider) : 'openai'
  if (provider !== 'openai') {
    throw new Error(`Unsupported image provider: ${provider}`)
  }

  const imageOpenAI = isPlainObject(image.openai) ? (image.openai as any) : {}

  const connections = isPlainObject(data.connections) ? (data.connections as any) : {}
  const openaiConn = isPlainObject(connections.openai) ? (connections.openai as any) : {}
  const urls: string[] = Array.isArray(openaiConn.api_base_urls) ? openaiConn.api_base_urls.filter((s: any) => typeof s === 'string') : []
  const keys: string[] = Array.isArray(openaiConn.api_keys) ? openaiConn.api_keys.filter((s: any) => typeof s === 'string') : []
  const api_configs: Record<string, any> = isPlainObject(openaiConn.api_configs) ? (openaiConn.api_configs as any) : {}

  // Prefer explicit image.openai base_url/api_key if present
  let baseUrl: string | undefined = typeof imageOpenAI.base_url === 'string' && imageOpenAI.base_url.trim() ? imageOpenAI.base_url.trim() : undefined
  let apiKey: string | undefined = typeof imageOpenAI.api_key === 'string' && imageOpenAI.api_key.trim() ? imageOpenAI.api_key.trim() : undefined
  let modelFromImage: string | undefined = typeof imageOpenAI.model === 'string' ? imageOpenAI.model : undefined
  let sizeFromImage: string | undefined = typeof imageOpenAI.size === 'string' ? imageOpenAI.size : undefined

  // If not explicitly provided, choose from connections.openai arrays
  let chosenIdx: number = -1
  if (!baseUrl || !apiKey) {
    // Prefer an enabled config that targets OpenAI
    const candidates: number[] = urls.map((_, i) => i)
    const enabled = candidates.filter(i => Boolean(api_configs?.[String(i)]?.enable))
    const byOpenAI = (arr: number[]) => arr.filter(i => /openai\.com\/v1|\/v1$/.test(String(urls[i] || '')))
    const prioritized = byOpenAI(enabled).concat(byOpenAI(candidates.filter(i => !enabled.includes(i)))).concat(enabled.filter(i => !byOpenAI(enabled).includes(i))).concat(candidates.filter(i => !enabled.includes(i)))
    chosenIdx = prioritized.find(i => typeof urls[i] === 'string' && typeof keys[i] === 'string') ?? -1
    if (chosenIdx >= 0) {
      baseUrl = baseUrl || urls[chosenIdx]
      apiKey = apiKey || keys[chosenIdx]
      // Read per-connection image defaults if present
      const imgCfg = api_configs?.[String(chosenIdx)]?.image || {}
      if (!modelFromImage && typeof imgCfg?.model === 'string') modelFromImage = imgCfg.model
      if (!sizeFromImage && typeof imgCfg?.size === 'string') sizeFromImage = imgCfg.size
    }
  }

  // Final fallbacks
  baseUrl = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
  if (!apiKey) {
    throw new Error('Missing OpenAI API key in config')
  }

  // Resolve model and size from config with sane defaults
  const requestedModelRaw = modelFromImage || 'gpt-image-1'
  const requestedModel = ALLOWED_MODELS.has(requestedModelRaw) ? requestedModelRaw : 'gpt-image-1'

  // Map non-image models to a supported image model while preserving requested
  const finalModel = (requestedModel === 'gpt-image-1' || requestedModel === 'dall-e-3') ? requestedModel : 'gpt-image-1'
  const size = (sizeFromImage || '1024x1024') as string

  return { baseUrl, apiKey, model: finalModel as 'gpt-image-1' | 'dall-e-3', requestedModel, size }
}

export async function saveBase64ImageToPublicPNG(base64Data: string, options?: { subdir?: string; filenamePrefix?: string }): Promise<{ url: string; filePath: string } | null> {
  try {
    const subdir = options?.subdir || 'images'
    const prefix = (options?.filenamePrefix || 'img').replace(/[^a-zA-Z0-9_-]/g, '') || 'img'
    const publicDir = path.join(process.cwd(), 'public')
    const imagesDir = path.join(publicDir, subdir)
    await mkdir(imagesDir, { recursive: true })
    const filename = `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`
    const filePath = path.join(imagesDir, filename)
    const buffer = Buffer.from(base64Data, 'base64')
    await writeFile(filePath, buffer)
    const url = `/${subdir}/${filename}`
    return { url, filePath }
  } catch {
    return null
  }
}

export const openaiImageTools = {
  generateImage: tool({
    description: 'Generate an image from a text prompt using OpenAI. Uses image config from database.',
    inputSchema: z.object({
      prompt: z.string().min(1, 'prompt is required'),
    }),
    execute: async ({ prompt }: { prompt: string }) => {
      const cfg = await resolveOpenAIImageConfig()

      const endpoint = `${cfg.baseUrl}/images/generations`

      const body: any = {
        model: cfg.model,
        prompt,
        size: cfg.size,
        n: 1,
      }
      // Default to HD quality for DALL·E 3 as requested
      if (cfg.model === 'dall-e-3') {
        body.quality = 'hd'
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`OpenAI image generation failed: ${res.status} ${res.statusText} ${errText?.slice(0, 500)}`)
      }

      const json = await res.json()
      const first = Array.isArray(json?.data) && json.data.length > 0 ? json.data[0] : null
      if (!first) {
        throw new Error('OpenAI image response missing data')
      }

      let url = typeof first?.url === 'string' ? first.url : ''
      const b64 = typeof first?.b64_json === 'string' ? first.b64_json : undefined

      // If provider did not return a URL, but returned base64, persist to public and return a local URL
      if (!url && b64) {
        const saved = await saveBase64ImageToPublicPNG(b64, { subdir: 'images', filenamePrefix: 'img' })
        if (saved?.url) url = saved.url
      }

      const usedModel = cfg.model
      const requested = cfg.requestedModel && cfg.requestedModel !== usedModel ? cfg.requestedModel : undefined

      const summaryParts = [
        'image generated',
        requested ? `(requested ${requested} -> using ${usedModel})` : `(model ${usedModel})`,
        cfg.size,
      ]

      return {
        summary: summaryParts.join(' '),
        url: url || '',
        details: {
          model: usedModel,
          requestedModel: requested || usedModel,
          size: cfg.size,
          revisedPrompt: typeof first?.revised_prompt === 'string' ? first.revised_prompt : undefined,
        } as any,
      }
    },
  }),
}

export type OpenAIImageTools = typeof openaiImageTools


