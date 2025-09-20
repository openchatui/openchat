import 'server-only'
import db from '@/lib/db'

/**
 * Returns whether web search is enabled according to server config.
 * Safe for server-side usage only.
 */
export async function getWebSearchEnabled(): Promise<boolean> {
  try {
    const cfg = await (db as any).config.findUnique({ where: { id: 1 } })
    const data = (cfg?.data || {}) as any
    const websearch = (data && typeof data === 'object') ? (data as any).websearch : undefined
    return Boolean(websearch && (websearch as any).ENABLED)
  } catch {
    return false
  }
}

/**
 * Returns whether image generation is available based on server config.
 * Currently supports OpenAI provider and checks for at least one API key.
 */
export async function getImageGenerationAvailable(): Promise<boolean> {
  try {
    const cfg = await (db as any).config.findUnique({ where: { id: 1 } })
    const data = (cfg?.data || {}) as any
    const image = data && typeof data === 'object' ? (data as any).image : undefined
    const provider = image && typeof image.provider === 'string' ? String(image.provider) : 'openai'
    if (provider !== 'openai') return false

    const imageOpenAI = image && typeof image.openai === 'object' ? (image.openai as any) : {}
    if (typeof imageOpenAI.api_key === 'string' && imageOpenAI.api_key.trim()) return true

    const connections = data && typeof data === 'object' ? (data as any).connections : undefined
    const openaiConn = connections && typeof connections.openai === 'object' ? (connections.openai as any) : {}
    const keys: any[] = Array.isArray(openaiConn.api_keys) ? openaiConn.api_keys : []
    return keys.some(k => typeof k === 'string' && k.trim().length > 0)
  } catch {
    return false
  }
}

export interface AudioConfig {
  ttsEnabled: boolean
  sttEnabled: boolean
  tts: { provider: 'openai' | 'elevenlabs' }
  stt: { provider: 'whisper-web' | 'openai' | 'webapi' | 'deepgram', whisperWeb: { model: string } }
}

export async function getAudioConfig(): Promise<AudioConfig> {
  try {
    const cfg = await (db as any).config.findUnique({ where: { id: 1 } })
    const data = (cfg?.data || {}) as any
    const audio = (data && typeof data === 'object' && (data as any).audio) ? (data as any).audio : {}
    const ttsEnabled = Boolean((audio as any).ttsEnabled)
    const sttEnabled = Boolean((audio as any).sttEnabled)
    const ttsProv = typeof (audio as any)?.tts?.provider === 'string' ? String((audio as any).tts.provider) : 'openai'
    const sttProv = typeof (audio as any)?.stt?.provider === 'string' ? String((audio as any).stt.provider) : 'whisper-web'
    const wwModel = typeof (audio as any)?.stt?.whisperWeb?.model === 'string' ? String((audio as any).stt.whisperWeb.model) : ''
    return {
      ttsEnabled,
      sttEnabled,
      tts: { provider: (ttsProv === 'elevenlabs' ? 'elevenlabs' : 'openai') as 'openai' | 'elevenlabs' },
      stt: { provider: (['openai', 'webapi', 'deepgram'].includes(sttProv) ? (sttProv as any) : 'whisper-web'), whisperWeb: { model: wwModel } }
    }
  } catch {
    return { ttsEnabled: false, sttEnabled: false, tts: { provider: 'openai' }, stt: { provider: 'whisper-web', whisperWeb: { model: '' } } }
  }
}


