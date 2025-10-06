"use server"

import db from "@/lib/db"

type TtsProvider = 'openai' | 'elevenlabs'
type SttProvider = 'whisper-web' | 'openai' | 'webapi' | 'deepgram'

interface UpdateAudioPayload {
  audio?: {
    ttsEnabled?: boolean
    sttEnabled?: boolean
    tts?: { provider?: TtsProvider; voiceId?: string; modelId?: string }
    stt?: { provider?: SttProvider; whisperWeb?: { model?: string } }
  }
}

export async function updateAudioConfigAction(payload: UpdateAudioPayload): Promise<void> {
  const row = await db.config.findUnique({ where: { id: 1 } })
  const current = (row?.data || {}) as any
  const currAudio = (current && typeof current === 'object' && (current as any).audio) ? (current as any).audio : {}
  const input = payload?.audio || {}

  const nextAudio = {
    ...currAudio,
    ...(typeof input.ttsEnabled !== 'undefined' ? { ttsEnabled: Boolean(input.ttsEnabled) } : {}),
    ...(typeof input.sttEnabled !== 'undefined' ? { sttEnabled: Boolean(input.sttEnabled) } : {}),
    tts: {
      ...(typeof currAudio.tts === 'object' ? currAudio.tts : {}),
      ...(typeof input.tts === 'object' ? input.tts : {}),
    },
    stt: {
      ...(typeof currAudio.stt === 'object' ? currAudio.stt : {}),
      ...(typeof input.stt === 'object' ? input.stt : {}),
      whisperWeb: {
        ...(currAudio?.stt?.whisperWeb || {}),
        ...(input?.stt?.whisperWeb || {}),
      }
    }
  }

  const nextData = { ...current, audio: nextAudio }
  if (row) {
    await db.config.update({ where: { id: 1 }, data: { data: nextData } })
  } else {
    await db.config.create({ data: { id: 1, data: nextData } })
  }
}


