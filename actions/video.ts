"use server"

import db from "@/lib/db"

type VideoProvider = 'openai'

interface UpdateVideoConfigInput {
  enabled?: boolean
  provider?: VideoProvider
  openai?: {
    model?: string
    size?: string
    seconds?: number
  }
}

export async function updateVideoConfigAction(input: UpdateVideoConfigInput): Promise<void> {
  const row = await db.config.findUnique({ where: { id: 1 } })
  const current = (row?.data || {}) as any
  const currVideo = (current && typeof current === 'object' && (current as any).video) ? (current as any).video : {}

  const nextVideo = {
    enabled: typeof input.enabled !== 'undefined' ? Boolean(input.enabled) : Boolean(currVideo.enabled),
    provider: (input.provider || currVideo.provider || 'openai') as VideoProvider,
    openai: {
      ...(typeof currVideo.openai === 'object' ? currVideo.openai : {}),
      ...(typeof input.openai === 'object' ? input.openai : {}),
    },
  }

  const nextData = { ...current, video: nextVideo }
  if (row) {
    await db.config.update({ where: { id: 1 }, data: { data: nextData } })
  } else {
    await db.config.create({ data: { id: 1, data: nextData } })
  }
}


