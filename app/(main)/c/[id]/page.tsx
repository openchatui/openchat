"use server"

import { ChatStandard } from '@/components/chat/chat-standard'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveModelsLight, getUserSettings } from '@/actions/chat'
import { cookies } from 'next/headers'
import { getWebSearchEnabled, getImageGenerationAvailable, getAudioConfig } from '@/lib/server'
import { getEffectivePermissionsForUser } from '@/lib/server'
import { AppConfigProvider } from '@/components/providers/AppConfigProvider'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id: chatId } = await params

  const [models, userSettings] = await Promise.all([
    getActiveModelsLight(),
    getUserSettings()
  ])

  const [webSearchAvailable, imageAvailable, audioConfig, eff] = await Promise.all([
    getWebSearchEnabled(),
    getImageGenerationAvailable(),
    getAudioConfig(),
    getEffectivePermissionsForUser(session.user.id),
  ])

  const cookieStore = await cookies()
  const timeZone = cookieStore.get('tz')?.value || 'UTC'

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


