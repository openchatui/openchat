"use server"

import { ChatStandard } from '@/components/chat/chat-standard'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listActiveModelsLight } from '@/lib/api/models'
import { getUserSettings } from '@/lib/api/userSettings'
import { cookies } from 'next/headers'
import { getWebSearchConfig } from '@api/websearch'
import { getImageConfig } from '@api/image'
import { getConnectionsConfig } from '@api/connections'
import { getAudioConfig as getAudioConfigApi } from '@api/audio'
import { getEffectivePermissionsForUser } from '@/lib/modules/access-control/permissions.service'
import { AppConfigProvider } from '@/components/providers/AppConfigProvider'
export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id: chatId } = await params

  const userId = session.user.id
  const [models, userSettings] = await Promise.all([
    listActiveModelsLight(),
    userId ? getUserSettings(userId) : Promise.resolve({} as any)
  ])

  const [webCfg, imgCfg, connCfg, audioConfig, eff] = await Promise.all([
    getWebSearchConfig(),
    getImageConfig(),
    getConnectionsConfig(),
    getAudioConfigApi(),
    getEffectivePermissionsForUser(session.user.id),
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

  const cookieStore = await cookies()
  const timeZone = cookieStore.get('tz')?.value || 'UTC'

  return (
    <AppConfigProvider initial={{
      webSearchAvailable,
      imageAvailable,
      audio: {
        ttsEnabled: audioConfig.ttsEnabled,
        sttEnabled: audioConfig.sttEnabled,
        ttsProvider: audioConfig.tts?.provider || 'openai',
        sttProvider: (audioConfig.stt?.provider || 'whisper-web') as 'whisper-web' | 'openai' | 'webapi' | 'deepgram',
        whisperWebModel: audioConfig.stt?.whisperWeb?.model || 'Xenova/whisper-small',
      }
    }}>
      <ChatStandard
        session={session}
        chatId={chatId}
        initialModels={models}
        initialUserSettings={userSettings as Record<string, any>}
        timeZone={timeZone}
        webSearchAvailable={webSearchAvailable}
        imageAvailable={imageAvailable}
        permissions={{
          workspaceTools: eff.workspace.tools,
          webSearch: eff.features.web_search,
          imageGeneration: eff.features.image_generation,
          codeInterpreter: eff.features.code_interpreter,
          stt: eff.chat.stt,
          tts: eff.chat.tts,
        }}
      />
    </AppConfigProvider>
  )
}


