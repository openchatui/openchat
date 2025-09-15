"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Session } from "next-auth"
import { toast } from 'sonner'
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { ChatInput } from "@/components/chat/chat-input"
import { ModelSelector } from "@/components/chat/model-selector"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Model } from "@/types/models"
import type { ChatData } from "@/lib/chat/chat-store"
import { createInitialChat, updateUserSettings } from "@/actions/chat"
import ChatMessages from "./chat-messages"

interface InitialChatClientProps {
  session: Session | null
  initialChats?: ChatData[]
  initialModels?: Model[]
  initialUserSettings?: Record<string, any>
  lastUsedModelId?: string | null
  pinnedModels?: Model[]
  timeZone?: string
}

export default function InitialChatClient({ session, initialChats = [], initialModels = [], initialUserSettings = {}, lastUsedModelId, pinnedModels = [], timeZone = 'UTC' }: InitialChatClientProps) {
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  // Use server-loaded models or fallback to empty array
  const models = initialModels

  // Determine the initially selected model synchronously
  const activeModels = models.filter(model => model.isActive && !model.meta?.hidden)

  // Priority: saved model from settings > last used model from chat history > first active model
  let initialSelectedModel: Model | null = null

  // First, try to use the saved model from user settings
  const savedModelId = initialUserSettings?.ui?.models?.[0]
  if (savedModelId) {
    const savedModel = activeModels.find(model => model.id === savedModelId || (model as any).providerId === savedModelId)
    if (savedModel) {
      initialSelectedModel = savedModel
    }
  }

  // If no saved model, try the last used model from chat history
  if (!initialSelectedModel && lastUsedModelId) {
    const lastUsedModel = activeModels.find(model => model.id === lastUsedModelId || (model as any).providerId === lastUsedModelId)
    if (lastUsedModel) {
      initialSelectedModel = lastUsedModel
    }
  }

  // Finally, fall back to first active model
  if (!initialSelectedModel && activeModels.length > 0) {
    initialSelectedModel = activeModels[0]
  }

  // Initialize selectedModel state with the initial model
  const [selectedModel, setSelectedModel] = useState<Model | null>(initialSelectedModel)

  // Use the selected model (can be changed by user selection)
  const currentSelectedModel = selectedModel

  const handleModelSelect = useCallback(async (model: Model) => {
    setSelectedModel(model)

    // Persist the selected model to user settings
    try {
      const updatedSettings = {
        ...initialUserSettings,
        ui: {
          ...initialUserSettings.ui,
          models: [((model as any).providerId || model.id)]
        }
      }
      await updateUserSettings(updatedSettings)
    } catch (error) {
      console.error('Failed to save model selection:', error)
      // Don't show error to user as this is not critical functionality
    }
  }, [initialUserSettings])

  const handleSendMessage = useCallback(async (
    value: string,
    options: {
      webSearch: boolean
      image: boolean
      codeInterpreter: boolean
    }
  ) => {
    if (!selectedModel) {
      toast.error('Please select a model first.')
      return
    }

    setIsCreating(true)

    try {
      // Create chat server-side with the message and model info
      const result = await createInitialChat(value, selectedModel.id)

      // Store assistant display info in session storage for the chat page
      if (result.assistantDisplayName && result.assistantImageUrl) {
        sessionStorage.setItem(`assistant_info_${result.chatId}`, JSON.stringify({
          displayName: result.assistantDisplayName,
          imageUrl: result.assistantImageUrl
        }))
      }

      // Redirect to the chat page (no URL params needed since message is already stored)
      router.push(`/c/${result.chatId}`)
    } catch (error) {
      console.error('Failed to create initial chat:', error)
      toast.error('Failed to start conversation. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }, [selectedModel, router])

  return (
    <SidebarProvider>
      <AppSidebar session={session} initialChats={initialChats} pinnedModels={pinnedModels} timeZone={timeZone} />
      <SidebarInset>
        <div className="flex flex-col h-full">
          {/* Header with model selector */}
          <div className="border-b">
            <ModelSelector
              selectedModelId={currentSelectedModel?.id}
              onModelSelect={handleModelSelect}
              models={models}
            />
          </div>

          {/* Centered content area */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-4xl mx-auto">
              {/* Hidden ChatMessages for initial render - will be empty but hydrated */}
              <div style={{ display: 'none' }}>
                <ChatMessages
                  messages={[]}
                  isLoading={false}
                  assistantDisplayName={currentSelectedModel?.name || 'AI Assistant'}
                  assistantImageUrl={currentSelectedModel?.meta?.profile_image_url || '/avatars/01.png'}
                />
              </div>
              {/* Welcome / Model info */}
              <div className="text-center mb-8">
                {currentSelectedModel ? (
                  <div className="flex items-center justify-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={currentSelectedModel.meta?.profile_image_url || "/OpenChat.png"}
                        alt={currentSelectedModel.name}
                      />
                      <AvatarFallback>
                        {currentSelectedModel.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-3xl font-semibold mb-3.5">
                      {currentSelectedModel.name}
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

              {/* Centered chat input */}
              <div className="w-full">
                <ChatInput
                  placeholder={isCreating ? "Creating conversation..." : "Ask me anything..."}
                  onSubmit={handleSendMessage}
                  disabled={isCreating}
                />
              </div>

              {/* Model selection hint */}
              {!currentSelectedModel && (
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
    </SidebarProvider>
  )
}
