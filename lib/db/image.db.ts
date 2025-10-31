import db from '@/lib/db'
import type { ImageProvider, OpenAIImageConfig, ImageConfig } from '@/types/image.types'

async function ensureConfigRow(): Promise<{ data: Record<string, unknown> }> {
  let row = await db.config.findUnique({ where: { id: 1 } })
  if (!row) {
    row = await db.config.create({ data: { id: 1, data: {} } })
  }
  return { data: (row.data || {}) as Record<string, unknown> }
}

export async function getImageConfigFromDb(): Promise<ImageConfig> {
  const { data } = await ensureConfigRow()
  const image = (data.image || {}) as Record<string, unknown>
  const providerRaw = typeof image.provider === 'string' ? String(image.provider).toLowerCase() : 'openai'
  const provider: ImageProvider = (['openai','comfyui','automatic1111'] as const).includes(providerRaw as any)
    ? (providerRaw as ImageProvider)
    : 'openai'
  const openaiRaw = (image.openai || {}) as Record<string, unknown>
  const openai: OpenAIImageConfig = {
    baseUrl: typeof openaiRaw.base_url === 'string' ? (openaiRaw.base_url as string) : '',
    apiKey: typeof openaiRaw.api_key === 'string' ? (openaiRaw.api_key as string) : '',
    model: typeof openaiRaw.model === 'string' ? (openaiRaw.model as string) : 'gpt-image-1',
    size: typeof openaiRaw.size === 'string' ? (openaiRaw.size as string) : '1024x1024',
    quality: typeof openaiRaw.quality === 'string' ? (openaiRaw.quality as string) : undefined,
    style: typeof openaiRaw.style === 'string' ? (openaiRaw.style as string) : undefined,
  }
  return { provider, openai }
}

export async function updateImageConfigInDb(partial: Partial<ImageConfig>): Promise<ImageConfig> {
  const { data } = await ensureConfigRow()
  const current = await getImageConfigFromDb()

  const next: ImageConfig = {
    provider: partial.provider ?? current.provider,
    openai: {
      baseUrl: partial.openai?.baseUrl ?? current.openai.baseUrl,
      apiKey: partial.openai?.apiKey ?? current.openai.apiKey,
      model: partial.openai?.model ?? current.openai.model,
      size: partial.openai?.size ?? current.openai.size,
      quality: partial.openai?.quality ?? current.openai.quality,
      style: partial.openai?.style ?? current.openai.style,
    },
  }

  const storedOpenAI: Record<string, unknown> = {
    base_url: next.openai.baseUrl,
    api_key: next.openai.apiKey,
    model: next.openai.model,
    size: next.openai.size,
  }
  if (typeof next.openai.quality === 'string') storedOpenAI.quality = next.openai.quality
  if (typeof next.openai.style === 'string') storedOpenAI.style = next.openai.style

  const nextData: Record<string, unknown> = {
    ...data,
    image: {
      provider: next.provider,
      openai: storedOpenAI,
    },
  }
  await db.config.update({ where: { id: 1 }, data: { data: nextData as any } })
  return next
}


