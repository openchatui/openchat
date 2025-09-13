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
  // Pre-computed display data to avoid client-side computation
  assistantDisplayName?: string
  assistantImageUrl?: string
}

export default function ChatMessages({
  messages,
  isLoading,
  error,
  selectedModel,
  assistantDisplayName = 'AI Assistant',
  assistantImageUrl = '/avatars/01.png'
}: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const reasoningTimersRef = useRef<Map<string, { start?: number; duration?: number }>>(new Map())

  // Use pre-computed values - no client-side computation needed
  const getAssistantDisplayName = () => assistantDisplayName
  const getAssistantImageUrl = () => assistantImageUrl

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

  // Extract reasoning segments wrapped in <think>...</think> and return visible text without those segments
  function extractReasoningFromThink(allText: string): { visibleText: string; reasoningText: string; reasoningActive: boolean } {
    if (typeof allText !== 'string' || allText.length === 0) {
      return { visibleText: '', reasoningText: '', reasoningActive: false }
    }

    const startTag = '<think>'
    const endTag = '</think>'
    let visibleText = allText
    let reasoningText = ''
    let reasoningActive = false

    // Handle complete <think>...</think> blocks (non-greedy, global)
    const completeRegex = /<think>[\s\S]*?<\/think>/g
    const matches = allText.match(completeRegex)
    if (matches && matches.length > 0) {
      reasoningText = matches
        .map((block) => block.replace('<think>', '').replace('</think>', ''))
        .join('\n\n')
      visibleText = allText.replace(completeRegex, '')
    }

    // Handle partial/streaming case (opening tag arrived, closing not yet)
    if (allText.includes(startTag) && !allText.includes(endTag)) {
      reasoningActive = true
      const startIdx = allText.indexOf(startTag)
      if (startIdx >= 0) {
        const afterStart = allText.slice(startIdx + startTag.length)
        reasoningText = reasoningText
          ? `${reasoningText}\n\n${afterStart}`
          : afterStart
        visibleText = allText.slice(0, startIdx)
      }
    }

    return {
      visibleText: visibleText.trim(),
      reasoningText: reasoningText.trim(),
      reasoningActive,
    }
  }


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
            <div className="flex flex-col gap-3 overflow-hidden rounded-4xl px-5 py-4 max-w-[80%] bg-muted text-primary">
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
            {/* AI avatar and model name on top (use per-message metadata) */}
            {(() => {
              const meta: any = (message as any).metadata || {}
              const headerName = (
                typeof meta.assistantDisplayName === 'string' && meta.assistantDisplayName && meta.assistantDisplayName !== 'Unknown Model'
              )
                ? meta.assistantDisplayName
                : (meta?.model?.name || getAssistantDisplayName())
              const headerImage = (
                typeof meta.assistantImageUrl === 'string' && meta.assistantImageUrl
              )
                ? meta.assistantImageUrl
                : (meta?.model?.profile_image_url || getAssistantImageUrl())
              return (
                <div className="flex items-center gap-2">
                  <MessageAvatar src={headerImage} name="AI" />
                  <span className="text-sm font-medium text-muted-foreground">{headerName}</span>
                </div>
              )
            })()}
            {/* Indent content to align with model name (avatar width + gap ~= ml-10) */}
            <div className="ml-10">
              {/* Reasoning (collapsible) - supports explicit reasoning parts and <think> tags inside text */}
              {(() => {
                const isLatestAssistant = lastAssistantMessageId === message.id

                // Explicit reasoning parts (if any)
                const reasoningParts = message.parts.filter(
                  (p: any) => typeof p?.type === 'string' && p.type.toLowerCase().includes('reason')
                ) as Array<{ type: string; text?: string }>
                const explicitReasoning = reasoningParts
                  .map((p) => (typeof p.text === 'string' ? p.text : ''))
                  .filter(Boolean)
                  .join('\n\n')

                // Extract reasoning from <think> blocks within the combined text
                const textOnly = (message.parts || [])
                  .filter((p: any) => p?.type === 'text')
                  .map((p: any) => String(p?.text || ''))
                  .join('')
                const { reasoningText: thinkReasoning, reasoningActive: thinkActive } = extractReasoningFromThink(textOnly)

                const reasoningText = explicitReasoning || thinkReasoning
                const reasoningActive = Boolean((message as any).metadata?.reasoningActive) || thinkActive
                const hasReasoning = (reasoningText && reasoningText.trim().length > 0) || (isLatestAssistant && reasoningActive)
                if (!hasReasoning) return null

                // Track per-message reasoning duration on client
                const timers = reasoningTimersRef.current
                const existing = timers.get(message.id) || {}
                const isReasoningStreaming = Boolean(isLatestAssistant && isLoading && reasoningActive)
                if (isReasoningStreaming && !existing.start) {
                  timers.set(message.id, { ...existing, start: Date.now() })
                }
                if (!isLoading && (reasoningText?.trim().length > 0) && existing.start && !existing.duration) {
                  const dur = Math.max(1, Math.round((Date.now() - existing.start) / 1000))
                  timers.set(message.id, { ...existing, duration: dur })
                }
                const measuredDuration = timers.get(message.id)?.duration || 0
                return (
                  <Reasoning isStreaming={isReasoningStreaming} defaultOpen={false} duration={measuredDuration}>
                    <ReasoningTrigger />
                    <ReasoningContent className='text-muted-foreground'>{reasoningText}</ReasoningContent>
                  </Reasoning>
                )
              })()}
              {/* AI message text below */}
              <div className="flex flex-col gap-3 text-foreground">
                {(() => {
                  // Render text with <think> blocks removed
                  const textOnly = (message.parts || [])
                    .filter((p: any) => p?.type === 'text')
                    .map((p: any) => String(p?.text || ''))
                    .join('')
                  const { visibleText } = extractReasoningFromThink(textOnly)
                  if (!visibleText) return null
                  return (
                    <div>
                      <Response className="prose prose-2xl leading-loose max-w-none prose-p:mt-8 prose-p:mb-8 prose-pre:my-5 prose-li:my-3">
                        {visibleText}
                      </Response>
                    </div>
                  )
                })()}
              </div>
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


