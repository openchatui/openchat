"use client"

import { useRef, useEffect } from 'react'
import { Bot } from 'lucide-react'
import { Message, MessageContent, MessageAvatar } from '@/components/ai/message'
import { Response } from '@/components/ai/response'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai/reasoning'
import type { UIMessage } from 'ai'
import type { MessageMetadata } from '@/types/messages'
import type { Model } from '@/types/models'

interface ChatMessagesProps {
  messages: UIMessage[]
  isLoading: boolean
  error?: Error | null
  selectedModel?: Model | null
}

export default function ChatMessages({ messages, isLoading, error, selectedModel }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Derive display name for assistant from message metadata, fallback to selected model
  const getAssistantDisplayName = (message: UIMessage) => {
    const meta = (message as UIMessage<MessageMetadata>).metadata
    const nameFromMessage = meta?.model?.name
    if (nameFromMessage) return nameFromMessage
    if (selectedModel?.name) return selectedModel.name
    return 'AI Assistant'
  }

  // Derive avatar image for assistant from message metadata, fallback to selected model
  const getAssistantImageUrl = (message: UIMessage) => {
    const meta = (message as UIMessage<MessageMetadata>).metadata
    const urlFromMessage = meta?.model?.profile_image_url
    if (urlFromMessage) return urlFromMessage
    if (selectedModel?.meta?.profile_image_url) return selectedModel.meta.profile_image_url
    return '/bot-avatar.png'
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Identify last assistant message for per-message streaming UI
  const lastAssistantMessageId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id
    }
    return null
  })()


  if (messages.length === 0) {
    return (
      <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
          <p className="text-sm">Send a message to begin chatting with the AI assistant.</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={scrollAreaRef}
      className="w-full h-full flex-1 min-h-0 overflow-y-auto pt-16"
    >
      <div className="max-w-5xl px-2.5 mx-auto space-y-6" style={{ paddingBottom: 'calc(200px)' }}>
      {messages.map((message) => 
        message.role === 'user' ? (
          <Message key={message.id} from={message.role}>
            {/* User message with bubble */}
            <div className="flex flex-col gap-3 overflow-hidden rounded-full px-5 py-4 max-w-[80%] bg-primary text-primary-foreground">
              {message.parts
                .filter((part) => part.type === 'text')
                .map((part, index) => (
                  <div key={index}>
                    <Response className="prose prose-2xl leading-loose prose-invert max-w-none prose-p:mt-8 prose-p:mb-8 prose-pre:my-5 prose-li:my-3">
                      {(part as any).text}
                    </Response>
                  </div>
                ))}
            </div>
          </Message>
        ) : (
          <div key={message.id} className="flex flex-col gap-2 py-4">
            {/* AI avatar and model name on top */}
            <div className="flex items-center gap-2">
              <MessageAvatar src={getAssistantImageUrl(message)} name="AI" />
              <span className="text-sm font-medium text-muted-foreground">{getAssistantDisplayName(message)}</span>
            </div>
            {/* Reasoning (collapsible) - only if reasoning-like parts exist */}
            {(() => {
              const isLatestAssistant = lastAssistantMessageId === message.id
              // Fuzzy match: include parts whose type contains "reason" (e.g., reasoning, reasoning-start)
              const reasoningParts = message.parts.filter(
                (p: any) => typeof p?.type === 'string' && p.type.toLowerCase().includes('reason')
              ) as Array<{ type: string; text?: string }>
              const reasoningText = reasoningParts
                .map((p) => (typeof p.text === 'string' ? p.text : ''))
                .filter(Boolean)
                .join('\n\n')
              const hasReasoning = reasoningText.trim().length > 0
              if (!hasReasoning) return null
              return (
                <Reasoning isStreaming={isLoading && isLatestAssistant} defaultOpen={false}>
                  <ReasoningTrigger />
                  <ReasoningContent>{reasoningText}</ReasoningContent>
                </Reasoning>
              )
            })()}
            {/* AI message text below */}
            <div className="flex flex-col gap-3 text-foreground">
              {message.parts
                .filter((part) => part.type === 'text')
                .map((part, index) => (
                  <div key={index}>
                    <Response className="prose prose-2xl leading-loose max-w-none prose-p:mt-8 prose-p:mb-8 prose-pre:my-5 prose-li:my-3">
                      {(part as any).text}
                    </Response>
                  </div>
                ))}
            </div>
          </div>
        )
      )}

      {/* Removed separate thinking indicator; the streaming cursor appears inline on the latest assistant message */}

      {error && (
        <div className="flex justify-center">
          <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg text-sm">
            Error: {error.message}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}


