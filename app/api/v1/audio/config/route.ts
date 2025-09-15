import { NextResponse } from 'next/server'
import db from '@/lib/db'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ensureAudioConfigShape(data: any): { audio: Record<string, unknown> } {
  const audio = isPlainObject(data?.audio) ? (data.audio as any) : {}
  const shaped: Record<string, unknown> = { ...audio }
  if (typeof shaped.ttsEnabled !== 'boolean') shaped.ttsEnabled = false
  if (typeof shaped.sttEnabled !== 'boolean') shaped.sttEnabled = false
  if (isPlainObject((audio as any).tts)) {
    const tts = (audio as any).tts as any
    const out: any = {}
    if (typeof tts.provider === 'string') out.provider = tts.provider
    if (typeof tts.voiceId === 'string') out.voiceId = tts.voiceId
    if (typeof tts.modelId === 'string') out.modelId = tts.modelId
    shaped.tts = out
  } else if (shaped.tts === undefined) {
    shaped.tts = {}
  }
  return { audio: shaped }
}

// GET /api/v1/audio/config - returns audio config, initializing if needed
export async function GET() {
  try {
    let config = await (db as any).config.findUnique({ where: { id: 1 } })
    if (!config) {
      const defaults = { audio: { ttsEnabled: false, sttEnabled: false } }
      config = await (db as any).config.create({ data: { id: 1, data: defaults } })
      return NextResponse.json(defaults)
    }

    const current = (config.data || {}) as Record<string, unknown>
    const shaped = ensureAudioConfigShape(current)

    const needsPersist = !isPlainObject((current as any).audio)
      || typeof (current as any).audio?.ttsEnabled !== 'boolean'
      || typeof (current as any).audio?.sttEnabled !== 'boolean'

    if (needsPersist) {
      const nextData = { ...current, ...shaped }
      await (db as any).config.update({ where: { id: 1 }, data: { data: nextData } })
    }

    return NextResponse.json(shaped)
  } catch (error) {
    console.error('GET /api/v1/audio/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch audio config' }, { status: 500 })
  }
}


