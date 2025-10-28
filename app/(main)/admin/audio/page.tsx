import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminAudio } from "@/components/admin/audio/AdminAudio"
import { ChatStore } from "@/lib/modules/chat"
import { AppConfigProvider } from "@/components/providers/AppConfigProvider"
import db from "@/lib/db"
import { getWebSearchConfig } from "@api/websearch"
import { getImageConfig } from "@api/image"
import { getConnectionsConfig } from "@api/connections"
import { getAudioConfig as getAudioConfigApi } from "@api/audio"


export default async function AdminAudioPage() {
  const session = await auth()
  if (!session || !session.user?.id) redirect("/login")

  const [chats, webCfg, imgCfg, connCfg, audioConfig] = await Promise.all([
    ChatStore.getUserChats(session.user.id),
    getWebSearchConfig(),
    getImageConfig(),
    getConnectionsConfig(),
    getAudioConfigApi(),
  ])

  const webSearchAvailable = !!(webCfg?.websearch?.ENABLED)
  const imageAvailable = (() => {
    const provider = imgCfg?.image?.provider || 'openai'
    if (provider !== 'openai') return false
    const imageKey = (imgCfg?.image?.openai?.apiKey || '').trim()
    if (imageKey) return true
    const keys = Array.isArray((connCfg as any)?.connections?.openai?.api_keys)
      ? ((connCfg as any).connections.openai.api_keys as unknown[])
      : []
    return keys.some((k) => typeof k === 'string' && (k as string).trim().length > 0)
  })()

  // Load connection keys for audio providers from server config
  const cfgRow = await db.config.findUnique({ where: { id: 1 } })
  const cfg = (cfgRow?.data || {}) as any
  const connections = (cfg && typeof cfg === 'object') ? (cfg as any).connections : {}
  const openai = (connections && typeof connections.openai === 'object') ? connections.openai as any : {}
  const elevenlabs = (connections && typeof connections.elevenlabs === 'object') ? connections.elevenlabs as any : {}
  const deepgram = (connections && typeof connections.deepgram === 'object') ? connections.deepgram as any : {}

  const openaiUrls: string[] = Array.isArray(openai.api_base_urls) ? openai.api_base_urls : []
  const openaiKeys: string[] = Array.isArray(openai.api_keys) ? openai.api_keys : []
  let openaiIdx = openaiUrls.findIndex((u: any) => typeof u === 'string' && String(u).toLowerCase().includes('openai.com'))
  if (openaiIdx < 0) openaiIdx = openaiUrls.findIndex((u: any) => typeof u === 'string' && /openai/.test(String(u)))
  const initialOpenAIBaseUrl = openaiIdx >= 0 ? String(openaiUrls[openaiIdx]) : ''
  const initialOpenAIApiKey = openaiIdx >= 0 ? String(openaiKeys[openaiIdx] || '') : ''
  const initialElevenLabsKey = Array.isArray(elevenlabs.api_keys) && elevenlabs.api_keys[0] ? String(elevenlabs.api_keys[0]) : ''
  const initialDeepgramKey = Array.isArray(deepgram.api_keys) && deepgram.api_keys[0] ? String(deepgram.api_keys[0]) : ''
  const initialElevenLabsVoiceId = (cfg?.audio?.tts?.voiceId && typeof cfg.audio.tts.voiceId === 'string') ? String(cfg.audio.tts.voiceId) : ''
  const initialElevenLabsModelId = (cfg?.audio?.tts?.modelId && typeof cfg.audio.tts.modelId === 'string') ? String(cfg.audio.tts.modelId) : ''

  return (
    <AppConfigProvider initial={{
      webSearchAvailable,
      imageAvailable,
      audio: {
        ttsEnabled: audioConfig.ttsEnabled,
        sttEnabled: audioConfig.sttEnabled,
        ttsProvider: audioConfig.tts.provider,
        sttProvider: audioConfig.stt.provider as any,
        whisperWebModel: audioConfig.stt.whisperWeb.model,
      }
    }}>
      <AdminAudio
        session={session}
        initialChats={chats}
        initialOpenAI={{ baseUrl: initialOpenAIBaseUrl, apiKey: initialOpenAIApiKey }}
        initialElevenLabs={{ apiKey: initialElevenLabsKey, voiceId: initialElevenLabsVoiceId, modelId: initialElevenLabsModelId }}
        initialDeepgram={{ apiKey: initialDeepgramKey }}
      />
    </AppConfigProvider>
  )
}


