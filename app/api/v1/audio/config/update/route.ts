import { NextRequest, NextResponse } from 'next/server'
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

/**
 * @swagger
 * /api/v1/audio/config/update:
 *   put:
 *     tags: [Audio]
 *     summary: Update audio configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated audio config subset
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Failed to update audio config
 */
// PUT /api/v1/audio/config/update - upsert audio config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const incomingAudio = (body?.audio ?? {}) as Record<string, unknown>

    if (!isPlainObject(incomingAudio)) {
      return NextResponse.json({ error: 'Invalid audio payload' }, { status: 400 })
    }

    const filtered: Record<string, unknown> = {}
    if ('ttsEnabled' in incomingAudio) {
      if (typeof incomingAudio.ttsEnabled !== 'boolean') {
        return NextResponse.json({ error: 'audio.ttsEnabled must be a boolean' }, { status: 400 })
      }
      filtered.ttsEnabled = incomingAudio.ttsEnabled
    }
    if ('sttEnabled' in incomingAudio) {
      if (typeof incomingAudio.sttEnabled !== 'boolean') {
        return NextResponse.json({ error: 'audio.sttEnabled must be a boolean' }, { status: 400 })
      }
      filtered.sttEnabled = incomingAudio.sttEnabled
    }

    // Optional nested STT configuration
    if ('stt' in incomingAudio) {
      const stt = (incomingAudio as any).stt
      if (!isPlainObject(stt)) {
        return NextResponse.json({ error: 'audio.stt must be an object' }, { status: 400 })
      }
      const sttOut: Record<string, unknown> = {}
      if ('provider' in stt) {
        const provider = stt.provider
        const allowed = ['whisper-web', 'openai', 'webapi', 'deepgram']
        if (typeof provider !== 'string' || !allowed.includes(provider)) {
          return NextResponse.json({ error: 'audio.stt.provider is invalid' }, { status: 400 })
        }
        sttOut.provider = provider
      }
      if ('whisperWeb' in stt && isPlainObject(stt.whisperWeb)) {
        const ww: any = {}
        if ('model' in stt.whisperWeb) {
          const model = stt.whisperWeb.model
          if (typeof model !== 'string') {
            return NextResponse.json({ error: 'audio.stt.whisperWeb.model must be a string' }, { status: 400 })
          }
          ww.model = model
        }
        if (Object.keys(ww).length > 0) sttOut.whisperWeb = ww
      }
      if (Object.keys(sttOut).length > 0) (filtered as any).stt = sttOut
    }

    // Optional nested TTS configuration
    if ('tts' in incomingAudio) {
      const tts = (incomingAudio as any).tts
      if (!isPlainObject(tts)) {
        return NextResponse.json({ error: 'audio.tts must be an object' }, { status: 400 })
      }
      const ttsOut: Record<string, unknown> = {}
      if ('provider' in tts) {
        const provider = tts.provider
        const allowed = ['openai', 'elevenlabs']
        if (typeof provider !== 'string' || !allowed.includes(provider)) {
          return NextResponse.json({ error: 'audio.tts.provider is invalid' }, { status: 400 })
        }
        ttsOut.provider = provider
      }
      if ('voiceId' in tts) {
        if (typeof tts.voiceId !== 'string') {
          return NextResponse.json({ error: 'audio.tts.voiceId must be a string' }, { status: 400 })
        }
        ttsOut.voiceId = tts.voiceId
      }
      if ('modelId' in tts) {
        if (typeof tts.modelId !== 'string') {
          return NextResponse.json({ error: 'audio.tts.modelId must be a string' }, { status: 400 })
        }
        ttsOut.modelId = tts.modelId
      }
      if (Object.keys(ttsOut).length > 0) (filtered as any).tts = ttsOut
    }

    let existing = await db.config.findUnique({ where: { id: 1 } })
    const currentData = (existing?.data || {}) as Record<string, unknown>
    const currentAudio = isPlainObject((currentData as any).audio) ? (currentData as any).audio : {}

    const mergedAudio = deepMerge(currentAudio, filtered)
    const nextData = {
      ...currentData,
      audio: { ttsEnabled: false, sttEnabled: false, ...mergedAudio },
    }

    const result = existing
      ? await db.config.update({ where: { id: 1 }, data: { data: nextData } })
      : await db.config.create({ data: { id: 1, data: nextData } })

    const data = (result.data || {}) as any
    const audio = isPlainObject(data.audio) ? (data.audio as any) : {}
    return NextResponse.json({ audio })
  } catch (error) {
    console.error('PUT /api/v1/audio/config/update error:', error)
    return NextResponse.json({ error: 'Failed to update audio config' }, { status: 500 })
  }
}


