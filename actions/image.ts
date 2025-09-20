"use server"

import db from "@/lib/db"

type ImageProvider = 'openai' | 'comfyui' | 'automatic1111'

export async function updateImageConfigAction(input: { provider?: ImageProvider }): Promise<void> {
  const row = await (db as any).config.findUnique({ where: { id: 1 } })
  const current = (row?.data || {}) as any
  const image = (current?.image && typeof current.image === 'object') ? current.image as any : {}
  const next = {
    ...current,
    image: {
      ...image,
      ...(typeof input.provider === 'string' ? { provider: input.provider } : {}),
    }
  }
  if (row) await (db as any).config.update({ where: { id: 1 }, data: { data: next } })
  else await (db as any).config.create({ data: { id: 1, data: next } })
}


