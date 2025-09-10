"use client"

import { useState, useEffect } from "react"
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, UIMessage } from 'ai';
import { useRouter, useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { ChatInput } from "@/components/chat/chat-input"
import { ModelSelector } from "@/components/chat/model-selector"
import { Session } from "next-auth"
import { toast } from 'sonner'
import { useModels } from "@/hooks/useModels"
import ChatMessages from "./chat-messages"
import { AnimatedLoader } from "@/components/ui/loader"
import type { Model } from "@/types/models"
import type { ChatData } from "@/lib/chat-store"

interface ChatClientProps {
  session: Session | null
  chatId: string
  initialMessages?: UIMessage[]
  initialChats?: ChatData[]
}

export default function ChatClient({ session, chatId, initialMessages = [], initialChats = [] }: ChatClientProps) {
  const { models, isLoading: modelsLoading } = useModels()
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Find the current model details from the models list
  const currentModel = selectedModel ? models.find(m => m.id === selectedModel.id) : null
  
  const { messages, status, error, sendMessage, stop } = useChat({
    id: chatId, // Use the provided chat ID
    messages: initialMessages, // Load initial messages from the database
    transport: new DefaultChatTransport({
      api: '/api/v1/chat',
      prepareSendMessagesRequest({ messages, id }) {
        return { 
          body: { 
            message: messages[messages.length - 1], 
            chatId: id,
            modelId: selectedModel?.id 
          } 
        };
      },
    }),
    onError: (error: Error) => {
      console.error('Chat error:', error)
      toast.error('Failed to send message. Please try again.')
    }
  })

  // Handle initialization state
  useEffect(() => {
    if (!modelsLoading && models.length > 0) {
      setIsInitializing(false)
    }
  }, [modelsLoading, models.length])

  // Handle initial message from URL params (for new chats)
  useEffect(() => {
    const initialMessage = searchParams.get('initialMessage')
    const modelId = searchParams.get('modelId')
    
    if (initialMessage && modelId && messages.length === 0 && models.length > 0) {
      // Set the selected model
      const model = models.find(m => m.id === modelId)
      if (model) {
        setSelectedModel(model)
        
        // Send the initial message immediately, include selected model metadata
        sendMessage({
          role: 'user',
          parts: [{ type: 'text', text: initialMessage }],
          metadata: {
            model: {
              id: model.id,
              name: model.name,
              profile_image_url: model.meta?.profile_image_url || null,
            }
          }
        })
        
        // Clean up the URL immediately without waiting
        router.replace(`/c/${chatId}`, { scroll: false })
      }
    }
  }, [searchParams, models, messages.length, sendMessage, router, chatId])

  const isLoading = status === 'streaming' || status === 'submitted'

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

    // For now, we'll just send the message
    // TODO: Implement options handling (webSearch, image, codeInterpreter)
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: value }],
      metadata: {
        model: {
          id: selectedModel.id,
          name: selectedModel.name,
          profile_image_url: selectedModel.meta?.profile_image_url || null,
        }
      }
    })
  }

  // Show loading state during initialization
  if (isInitializing || modelsLoading) {
    return (
      <SidebarProvider>
        <AppSidebar session={session} initialChats={initialChats} />
        <SidebarInset>
          <div className="flex items-center justify-center h-full">
            <AnimatedLoader 
              size="lg" 
              message="Loading chat..." 
              className="text-center"
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar session={session} initialChats={initialChats} />
      <SidebarInset>
        <div className="relative flex flex-col h-full">
          <ModelSelector 
            selectedModelId={selectedModel?.id}
            onModelSelect={handleModelSelect}
          />

          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0">
              <ChatMessages 
                messages={messages}
                isLoading={isLoading}
                error={error}
                selectedModel={currentModel}
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <ChatInput 
                onSubmit={handleSendMessage}
                disabled={false}
                isStreaming={isLoading}
                onStop={() => stop()}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
