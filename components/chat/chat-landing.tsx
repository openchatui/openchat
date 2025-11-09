"use client"

import { useEffect, useState } from 'react'
import { SidebarInset } from '@/components/ui/sidebar'
import { ChatInput } from '@/components/chat/chat-input'
import { ModelSelector } from '@/components/chat/model-selector'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import PromptSuggestions from '@/components/chat/prompt-suggestions'
import type { Session } from 'next-auth'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Model } from '@/types/model.types'
import { updateUserSettingsRaw } from '@/lib/api/userSettings'
import { useChatStore } from '@/lib/modules/chat/chat.client-store'

interface ChatLandingProps {
  session: Session | null
  initialModels: Model[]
  initialUserSettings?: Record<string, any>
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

export function ChatLanding({
  session,
  initialModels = [],
  initialUserSettings = {},
  webSearchAvailable = true,
  imageAvailable = true,
  permissions
}: ChatLandingProps) {
  const router = useRouter()
  const [selectedModel, setSelectedModel] = useState<Model | null>(() => {
    const activeModels = initialModels.filter(m => m.isActive && !(m as any).meta?.hidden)
    const saved = (initialUserSettings as any)?.ui?.models?.[0]
    if (saved && activeModels.length > 0) {
      const normalize = (v: string) => v.trim().toLowerCase()
      const savedNorm = normalize(saved)
      const preferred = activeModels.find((m) => {
        const idMatch = normalize(m.id) === savedNorm
        const providerId = (m as any).providerId as string | undefined
        const providerMatch = providerId ? normalize(providerId) === savedNorm : false
        const providerSuffixMatch = providerId ? normalize((providerId.split('/').pop() || providerId)) === savedNorm : false
        const nameMatch = normalize(m.name) === savedNorm
        return idMatch || providerMatch || providerSuffixMatch || nameMatch
      })
      if (preferred) return preferred
    }
    return activeModels.length > 0 ? activeModels[0] : null
  })
  const { resetChat, startNewChat } = useChatStore()

  useEffect(() => {
    // Initialize from saved/default only when nothing is selected yet
    if (selectedModel) return
    const activeModels = initialModels.filter(m => m.isActive && !(m as any).meta?.hidden)
    const saved = (initialUserSettings as any)?.ui?.models?.[0]
    if (saved && activeModels.length > 0) {
      const normalize = (v: string) => v.trim().toLowerCase()
      const savedNorm = normalize(saved)
      const preferred = activeModels.find((m) => {
        const idMatch = normalize(m.id) === savedNorm
        const providerId = (m as any).providerId as string | undefined
        const providerMatch = providerId ? normalize(providerId) === savedNorm : false
        const providerSuffixMatch = providerId ? normalize((providerId.split('/').pop() || providerId)) === savedNorm : false
        const nameMatch = normalize(m.name) === savedNorm
        return idMatch || providerMatch || providerSuffixMatch || nameMatch
      })
      if (preferred) { setSelectedModel(preferred); return }
    }
    if (activeModels.length > 0) setSelectedModel(activeModels[0])
  }, [initialModels, initialUserSettings, selectedModel])

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

  const beginChat = async (prompt: string, attachedFiles?: Array<{ file: File; localId: string } | { fileId: string; fileName: string }>) => {
    if (!selectedModel) {
      toast.error('Please select a model first.')
      return
    }

    // Reset any previous chat state and optimistically start
    resetChat()
    try {
      const chatId = await startNewChat(prompt, selectedModel, attachedFiles)
      try {
        const baseKey = 'chat-input'
        const chatKey = `chat-input-${chatId}`
        const raw = sessionStorage.getItem(baseKey)
        if (raw) {
          try {
            const data = JSON.parse(raw)
            if (data && typeof data === 'object') {
              data.prompt = ""
              sessionStorage.setItem(chatKey, JSON.stringify(data))
            } else {
              sessionStorage.setItem(chatKey, raw)
            }
          } catch {
            sessionStorage.setItem(chatKey, raw)
          }
          sessionStorage.removeItem(baseKey)
        }
      } catch {}
      router.replace(`/c/${chatId}`)
    } catch (e) {
      toast.error('Failed to start conversation. Please try again.')
    }
  }

  return (
    <SidebarInset>
      <div className="flex flex-col h-full">
        <div className="border-b">
          <ModelSelector
            key={`model-selector-${selectedModel?.id || 'none'}`}
            selectedModelId={selectedModel?.id}
            onModelSelect={handleModelSelect}
            models={initialModels}
            currentUserId={session?.user?.id || null}
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-4xl mx-auto">
            <div className="text-center mb-8">
              {selectedModel ? (
                <div className="flex items-center justify-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={selectedModel.meta?.profile_image_url || "/OpenChat.png"}
                      alt={selectedModel.name}
                    />
                    <AvatarFallback>
                      {selectedModel.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-3xl font-semibold mb-3.5">
                    {selectedModel.name}
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-4xl font-semibold mb-4">
                    How can I help you today?
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Start a conversation with AI
                  </p>
                </>
              )}
            </div>

            <div className="w-full">
              <ChatInput
                placeholder={"Ask me anything..."}
                onSubmit={(value, options, overrideModel, isAutoSend, streamHandlers, attachedFiles) => { 
                  void beginChat(value, attachedFiles) 
                }}
                disabled={false}
                sessionStorageKey={'chat-input'}
                webSearchAvailable={webSearchAvailable && !!permissions?.workspaceTools && !!permissions?.webSearch}
                imageAvailable={imageAvailable && !!permissions?.workspaceTools && !!permissions?.imageGeneration}
                codeInterpreterAvailable={!!permissions?.workspaceTools && !!permissions?.codeInterpreter}
                sttAllowed={!!permissions?.stt}
                ttsAllowed={!!permissions?.tts}
              />
              <PromptSuggestions
                disabled={false}
                onSelect={(prompt) => { void beginChat(prompt) }}
              />
            </div>

            {!selectedModel && (
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Please select a model from the dropdown above to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}


