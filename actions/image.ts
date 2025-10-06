"use server"

import db from "@/lib/db"

type ImageProvider = 'openai' | 'comfyui' | 'automatic1111'

export async function updateImageConfigAction(input: { provider?: ImageProvider }): Promise<void> {
  const row = await db.config.findUnique({ where: { id: 1 } })
  const current = (row?.data || {}) as any
  const image = (current?.image && typeof current.image === 'object') ? current.image as any : {}
  const next = {
    ...current,
    image: {
      ...image,
      ...(typeof input.provider === 'string' ? { provider: input.provider } : {}),
    }
  }
  if (row) await db.config.update({ where: { id: 1 }, data: { data: next } })
  else await db.config.create({ data: { id: 1, data: next } })
}

export async function updateOpenAIImageConfigAction(input: { baseUrl?: string; apiKey?: string; model?: string; size?: string; quality?: string; style?: string }): Promise<void> {
  const row = await db.config.findUnique({ where: { id: 1 } })
  const current = (row?.data || {}) as any
  const image = (current?.image && typeof current.image === 'object') ? current.image as any : {}
  const openai = (image?.openai && typeof image.openai === 'object') ? image.openai as any : {}

  const nextOpenAI = {
    ...openai,
    ...(typeof input.baseUrl === 'string' && input.baseUrl ? { base_url: String(input.baseUrl) } : {}),
    ...(typeof input.apiKey === 'string' && input.apiKey ? { api_key: String(input.apiKey) } : {}),
    ...(typeof input.model === 'string' && input.model ? { model: String(input.model) } : {}),
    ...(typeof input.size === 'string' && input.size ? { size: String(input.size) } : {}),
    ...(typeof input.quality === 'string' && input.quality ? { quality: String(input.quality) } : {}),
    ...(typeof input.style === 'string' && input.style ? { style: String(input.style) } : {}),
  }

  const next = {
    ...current,
    image: {
      ...image,
      openai: nextOpenAI,
    }
  }

  if (row) await db.config.update({ where: { id: 1 }, data: { data: next } })
  else await db.config.create({ data: { id: 1, data: next } })
}


