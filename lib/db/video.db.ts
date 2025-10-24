import 'server-only'
import db from '@/lib/db'
import type { VideoConfig, VideoProvider, OpenAIVideoConfig } from '@/types/video.types'

async function ensureConfigRow(): Promise<{ data: Record<string, unknown> }> {
  let row = await db.config.findUnique({ where: { id: 1 } })
  if (!row) row = await db.config.create({ data: { id: 1, data: {} } })
  return { data: (row.data || {}) as Record<string, unknown> }
}

export async function getVideoConfigFromDb(): Promise<VideoConfig> {
  const { data } = await ensureConfigRow()
  const raw = (data.video || {}) as Record<string, unknown>
  const enabled = typeof raw.enabled === 'boolean' ? (raw.enabled as boolean) : false
  const provider: VideoProvider = raw.provider === 'openai' ? 'openai' : 'openai'
  const o = (raw.openai || {}) as Record<string, unknown>
  const openai: OpenAIVideoConfig = {
    model: typeof o.model === 'string' ? (o.model as string) : 'sora-2-pro',
    size: typeof o.size === 'string' ? (o.size as string) : '1280x720',
    seconds: Number.isFinite(o.seconds as number) ? Number(o.seconds as number) : 4,
  }
  return { enabled, provider, openai }
}

export async function updateVideoConfigInDb(partial: Partial<VideoConfig>): Promise<VideoConfig> {
  const { data } = await ensureConfigRow()
  const current = await getVideoConfigFromDb()

  const next: VideoConfig = {
    enabled: typeof partial.enabled === 'boolean' ? partial.enabled : current.enabled,
    provider: (partial.provider || current.provider || 'openai') as VideoProvider,
    openai: {
      model: partial.openai?.model ?? current.openai.model,
      size: partial.openai?.size ?? current.openai.size,
      seconds: typeof partial.openai?.seconds === 'number' ? partial.openai.seconds : current.openai.seconds,
    },
  }

  const nextData: Record<string, unknown> = {
    ...data,
    video: {
      enabled: next.enabled,
      provider: next.provider,
      openai: { model: next.openai.model, size: next.openai.size, seconds: next.openai.seconds },
    },
  }
  await db.config.update({ where: { id: 1 }, data: { data: nextData as any } })
  return next
}


