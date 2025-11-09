"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SidebarInset } from '@/components/ui/sidebar'
import { ModelSelector } from '@/components/chat/model-selector'
import { ChatInput } from '@/components/chat/chat-input'
import type { Session } from 'next-auth'
import type { Model } from '@/types/model.types'
import { useChatStore } from '@/lib/modules/chat/chat.client-store'
import { useRouter } from 'next/navigation'
import { getChatMessages } from '@/lib/api/chats'
import { updateUserSettingsRaw } from '@/lib/api/userSettings'
import { useChatStreaming } from '@/hooks/useChatStreaming'
import { Loader } from '@/components/ui/loader'
import ChatMessages from '@/components/chat/chat-messages'

interface ChatStandardProps {
  session: Session | null
  chatId: string
  initialModels: Model[]
  initialUserSettings?: Record<string, any>
  timeZone?: string
  webSearchAvailable?: boolean
  imageAvailable?: boolean
  permissions?: {
    workspaceTools: boolean
    webSearch: boolean
    imageGeneration: boolean
    codeInterpreter: boolean
    stt: boolean
    tts: boolean
  }
}

//

export function ChatStandard({
  session,
  chatId,
  initialModels = [],
  initialUserSettings = {},
  timeZone = 'UTC',
  webSearchAvailable = true,
  imageAvailable = true,
  permissions,
}: ChatStandardProps) {
  const router = useRouter()
  const { currentChatId, setCurrentChatId, messages, setMessages } = useChatStore()
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const hasAutoSentRef = useRef(false)

  useEffect(() => {
    if (currentChatId !== chatId) setCurrentChatId(chatId)
  }, [chatId, currentChatId, setCurrentChatId])

  // On chat change, reset auto-send guard and clear messages to prepare for new chat
  useEffect(() => {
    hasAutoSentRef.current = false
    // Clear messages when switching chats to avoid showing stale data
    setMessages([])
  }, [chatId, setMessages])

  // (removed) defer message loading until after streaming hook is available

  // Initialize selected model from messages or settings
  useEffect(() => {
    if (!selectedModel && initialModels.length > 0) {
      // Prefer model from last user/assistant message metadata
      for (let i = messages.length - 1; i >= 0; i--) {
        const meta = (messages[i] as any)?.metadata
        const modelId = meta?.model?.id
        if (modelId) {
          const found = initialModels.find(m => m.id === modelId || (m as any).providerId === modelId)
          if (found) { setSelectedModel(found); return }
        }
      }
      // Fallback to user settings
      const savedModelId = (initialUserSettings as any)?.ui?.models?.[0]
      if (savedModelId) {
        const preferred = initialModels.find(m => m.id === savedModelId || (m as any).providerId === savedModelId)
        if (preferred) { setSelectedModel(preferred); return }
      }
      // Else pick first active visible
      const activeModels = initialModels.filter(m => m.isActive && !(m as any).meta?.hidden)
      if (activeModels.length > 0) setSelectedModel(activeModels[0])
    }
  }, [selectedModel, messages, initialModels, initialUserSettings])

  // Do not override user selection after initial set; only apply when none is selected yet
  useEffect(() => {
    if (selectedModel) return
    if (initialModels.length === 0 || messages.length === 0) return
    for (let i = messages.length - 1; i >= 0; i--) {
      const meta = (messages[i] as any)?.metadata
      const modelId = meta?.model?.id
      if (modelId) {
        const found = initialModels.find(m => m.id === modelId || (m as any).providerId === modelId)
        if (found) { setSelectedModel(found) }
        break
      }
    }
  }, [messages, initialModels, selectedModel])

  const currentModel = useMemo(() => {
    return selectedModel
      ? (initialModels.find(m => m.id === selectedModel.id || (m as any).providerId === selectedModel.id) || selectedModel)
      : null
  }, [selectedModel, initialModels])

  const assistantInfo = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i] as any
      if (msg?.role === 'assistant') {
        const meta = msg?.metadata || {}
        const name = (meta.assistantDisplayName && meta.assistantDisplayName !== 'Unknown Model')
          ? meta.assistantDisplayName
          : (meta?.model?.name || '')
          || selectedModel?.name
          || 'AI Assistant'
        const imageUrl = (meta.assistantImageUrl && typeof meta.assistantImageUrl === 'string')
          ? meta.assistantImageUrl
          : (meta?.model?.profile_image_url || '')
          || selectedModel?.meta?.profile_image_url
          || '/avatars/01.png'
        return { displayName: name, imageUrl }
      }
    }
    // Fallback: use model info from the latest user message metadata if available
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i] as any
      if (msg?.role === 'user') {
        const meta = msg?.metadata || {}
        const modelMeta = meta?.model || {}
        const name =
          (typeof modelMeta.name === 'string' && modelMeta.name) ||
          selectedModel?.name ||
          'AI Assistant'
        const imageUrl =
          (typeof modelMeta.profile_image_url === 'string' && modelMeta.profile_image_url) ||
          selectedModel?.meta?.profile_image_url ||
          '/avatars/01.png'
        return { displayName: name, imageUrl }
      }
    }
    // Final fallback
    return { displayName: selectedModel?.name || 'AI Assistant', imageUrl: selectedModel?.meta?.profile_image_url || '/avatars/01.png' }
  }, [messages, selectedModel])

  const handleModelSelect = async (model: Model) => {
    setSelectedModel(model)
    try {
      const updatedSettings = {
        ...(initialUserSettings || {}),
        ui: {
          ...((initialUserSettings || {}).ui || {}),
          models: [(((model as any).providerId) || model.id)]
        }
      }
      if (session?.user?.id) {
        await updateUserSettingsRaw(session.user.id, updatedSettings)
      }
    } catch (error) {
      console.error('Failed to save model selection:', error)
    }
  }

  const { handleSendMessage, handleStop, isLoading, error } = useChatStreaming({ chatId, initialModels, selectedModel })

  // Load messages for the active chat (messages are cleared on chatId change above)
  useEffect(() => {
    if (!chatId) return
    let cancelled = false
    getChatMessages(chatId)
      .then((loaded) => {
        if (cancelled || isLoading) return
        if (!Array.isArray(loaded)) return
        // Only set if we don't have messages yet (cleared on chat change)
        if ((messages as any[])?.length === 0) {
          setMessages(loaded as any)
        }
      })
      .catch((err) => { console.error('Failed to load messages:', err) })
    return () => { cancelled = true }
  }, [chatId, isLoading, messages?.length, setMessages])

  // Auto-send if we have a single user message and no assistant yet
  useEffect(() => {
    if (!hasAutoSentRef.current && messages.length > 0 && !isLoading && selectedModel) {
      const hasAssistant = messages.some(m => m.role === 'assistant')
      if (!hasAssistant) {
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i]
          if (m.role === 'user') {
            const textContent = (m.parts.find(p => p.type === 'text') as any)?.text
            if (textContent) {
              hasAutoSentRef.current = true
              // Read pill states from sessionStorage for this chat
              let webSearchFromStorage = false
              let imageFromStorage = false
              let codeFromStorage = false
              let videoFromStorage = false
              try {
                const raw = sessionStorage.getItem(`chat-input-${chatId}`)
                if (raw) {
                  const data = JSON.parse(raw)
                  webSearchFromStorage = Boolean(data?.webSearchEnabled)
                  imageFromStorage = Boolean(data?.imageGenerationEnabled)
                  codeFromStorage = Boolean(data?.codeInterpreterEnabled)
                  videoFromStorage = Boolean((data as any)?.videoGenerationEnabled)
                }
              } catch {}
              void handleSendMessage(
                textContent,
                { webSearch: webSearchFromStorage, image: imageFromStorage, video: videoFromStorage, codeInterpreter: codeFromStorage },
                selectedModel,
                true
              )
            }
            break
          }
        }
      }
    }
  }, [messages, isLoading, selectedModel, handleSendMessage, chatId])

  return (
    <SidebarInset>
      <div className="relative flex flex-col h-full">
        <ModelSelector
          key={`model-selector-${currentModel?.id || 'none'}`}
          selectedModelId={currentModel?.id}
          onModelSelect={handleModelSelect}
          models={initialModels}
          currentUserId={session?.user?.id || null}
        />

        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0">
            <ChatMessages
              messages={messages as any}
              isLoading={isLoading}
              error={error as any}
              selectedModel={currentModel as any}
              assistantDisplayName={assistantInfo.displayName}
              assistantImageUrl={assistantInfo.imageUrl}
              timeZone={timeZone}
              toolsAvailable={!!permissions?.workspaceTools}
              webSearchAllowed={!!permissions?.webSearch}
              imageGenerationAllowed={!!permissions?.imageGeneration}
            />
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <ChatInput
              onSubmit={handleSendMessage}
              disabled={false}
              isStreaming={isLoading}
              onStop={handleStop}
              sessionStorageKey={`chat-input-${chatId}`}
              webSearchAvailable={webSearchAvailable && !!permissions?.workspaceTools && !!permissions?.webSearch}
              imageAvailable={imageAvailable && !!permissions?.workspaceTools && !!permissions?.imageGeneration}
              codeInterpreterAvailable={!!permissions?.workspaceTools && !!permissions?.codeInterpreter}
              sttAllowed={!!permissions?.stt}
              ttsAllowed={!!permissions?.tts}
            />
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}


