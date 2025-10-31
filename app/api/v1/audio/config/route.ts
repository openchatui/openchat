import { NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Prisma } from '@prisma/client'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ensureAudioConfigShape(data: unknown): { audio: Record<string, unknown> } {
  const audio = isPlainObject((data as Record<string, unknown>)?.audio) 
    ? ((data as Record<string, unknown>).audio as Record<string, unknown>) 
    : {}
  const shaped: Record<string, unknown> = { ...audio }
  if (typeof shaped.ttsEnabled !== 'boolean') shaped.ttsEnabled = false
  if (typeof shaped.sttEnabled !== 'boolean') shaped.sttEnabled = false
  
  // Ensure tts field
  if (isPlainObject((audio as Record<string, unknown>).tts)) {
    const tts = (audio as Record<string, unknown>).tts as Record<string, unknown>
    const out: Record<string, unknown> = {}
    if (typeof tts.provider === 'string') out.provider = tts.provider
    if (typeof tts.voiceId === 'string') out.voiceId = tts.voiceId
    if (typeof tts.modelId === 'string') out.modelId = tts.modelId
    shaped.tts = out
  } else if (shaped.tts === undefined) {
    shaped.tts = { provider: 'openai' }
  }
  
  // Ensure stt field with proper defaults
  if (isPlainObject((audio as Record<string, unknown>).stt)) {
    const stt = (audio as Record<string, unknown>).stt as Record<string, unknown>
    const out: Record<string, unknown> = {}
    if (typeof stt.provider === 'string') out.provider = stt.provider
    if (isPlainObject(stt.whisperWeb)) {
      const whisperWeb = stt.whisperWeb as Record<string, unknown>
      const wOut: Record<string, unknown> = {}
      if (typeof whisperWeb.model === 'string') wOut.model = whisperWeb.model
      out.whisperWeb = wOut
    } else {
      out.whisperWeb = { model: 'Xenova/whisper-small' }
    }
    shaped.stt = out
  } else {
    shaped.stt = { 
      provider: 'whisper-web',
      whisperWeb: { model: 'Xenova/whisper-small' }
    }
  }
  
  return { audio: shaped }
}

/**
 * @swagger
 * /api/v1/audio/config:
 *   get:
 *     tags: [Audio]
 *     summary: Get audio configuration (creates defaults if missing)
 *     responses:
 *       200:
 *         description: Audio configuration
 *       500:
 *         description: Failed to fetch audio config
 */
// GET /api/v1/audio/config - returns audio config, initializing if needed
export async function GET() {
  try {
    let config = await db.config.findUnique({ where: { id: 1 } })
    if (!config) {
      const defaults = { 
        audio: { 
          ttsEnabled: false, 
          sttEnabled: false,
          tts: { provider: 'openai' },
          stt: { 
            provider: 'whisper-web',
            whisperWeb: { model: 'Xenova/whisper-small' }
          }
        } 
      }
      config = await db.config.create({ data: { id: 1, data: defaults as unknown as Prisma.InputJsonValue } })
      return NextResponse.json(defaults)
    }

    const current = (config.data || {}) as Record<string, unknown>
    const shaped = ensureAudioConfigShape(current)

    const needsPersist = !isPlainObject((current as any).audio)
      || typeof (current as any).audio?.ttsEnabled !== 'boolean'
      || typeof (current as any).audio?.sttEnabled !== 'boolean'

    if (needsPersist) {
      const nextData = { ...current, ...shaped }
      await db.config.update({ where: { id: 1 }, data: { data: nextData as unknown as Prisma.InputJsonValue } })
    }

    return NextResponse.json(shaped)
  } catch (error) {
    console.error('GET /api/v1/audio/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch audio config' }, { status: 500 })
  }
}


