"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Session } from "next-auth"
import { toast } from 'sonner'
import { useModels } from "@/hooks/useModels"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { ChatInput } from "@/components/chat/chat-input"
import { ModelSelector } from "@/components/chat/model-selector"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Model } from "@/types/models"
import { generateId } from 'ai'
import type { ChatData } from "@/lib/chat-store"

interface InitialChatClientProps {
  session: Session | null
  initialChats?: ChatData[]
}

export default function InitialChatClient({ session, initialChats = [] }: InitialChatClientProps) {
  const { models } = useModels()
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const router = useRouter()

  const handleModelSelect = (model: Model) => {
    setSelectedModel(model)
  }

  const handleSendMessage = (
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

    // Generate a new chat ID and redirect immediately - no async operations
    const chatId = generateId()
    
    // Instant redirect to the chat page with the new chat ID and initial message
    // The ChatClient will handle creating the chat and sending the message
    router.push(`/c/${chatId}?initialMessage=${encodeURIComponent(value)}&modelId=${selectedModel.id}`)
  }

  return (
    <SidebarProvider>
      <AppSidebar session={session} initialChats={initialChats} />
      <SidebarInset>
        <div className="flex flex-col h-full">
          {/* Header with model selector */}
          <div className="border-b">
            <ModelSelector 
              selectedModelId={selectedModel?.id}
              onModelSelect={handleModelSelect}
            />
          </div>

          {/* Centered content area */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-4xl mx-auto">
              {/* Welcome / Model info */}
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

              {/* Centered chat input */}
              <div className="w-full">
                <ChatInput 
                  placeholder="Ask me anything..."
                  onSubmit={handleSendMessage}
                  disabled={false}
                />
              </div>

              {/* Model selection hint */}
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
    </SidebarProvider>
  )
}
