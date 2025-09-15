"use client"

import { useRef, useEffect } from 'react'
import { Bot, CopyIcon } from 'lucide-react'
import { Actions, Action, SpeakAction } from '@/components/ai/actions'
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
  timeZone?: string
}

export default function ChatMessages({
  messages,
  isLoading,
  error,
  selectedModel,
  assistantDisplayName = 'AI Assistant',
  assistantImageUrl = '/avatars/01.png',
  timeZone = 'UTC'
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

  function formatTimestampLabel(createdAt?: number): { label: string; tooltip: string } | null {
    if (!createdAt || Number.isNaN(createdAt)) return null
    const d = new Date(createdAt)
    if (Number.isNaN(d.getTime())) return null

    const tz = timeZone || 'UTC'
    const getZonedYMD = (date: Date) => {
      try {
        const parts = new Intl.DateTimeFormat(undefined, {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(date)
        const y = Number(parts.find(p => p.type === 'year')?.value)
        const m = Number(parts.find(p => p.type === 'month')?.value)
        const dd = Number(parts.find(p => p.type === 'day')?.value)
        return { y, m, dd }
      } catch {
        return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, dd: d.getUTCDate() }
      }
    }

    const now = new Date()
    const dParts = getZonedYMD(d)
    const nowParts = getZonedYMD(now)
    const yParts = getZonedYMD(new Date(now.getTime() - 24 * 60 * 60 * 1000))

    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz })

    let dayPart: string
    if (dParts.y === nowParts.y && dParts.m === nowParts.m && dParts.dd === nowParts.dd) {
      dayPart = 'Today'
    } else if (dParts.y === yParts.y && dParts.m === yParts.m && dParts.dd === yParts.dd) {
      dayPart = 'Yesterday'
    } else {
      const mm = String(dParts.m).padStart(2, '0')
      const dd = String(dParts.dd).padStart(2, '0')
      const yy = String(dParts.y).slice(-2)
      dayPart = `${mm}/${dd}/${yy}`
    }

    const label = `${dayPart} at ${time}`
    const tooltip = d.toLocaleString(undefined, { hour12: true, timeZone: tz })
    return { label, tooltip }
  }

  function getVisibleTextForCopy(message: UIMessage): string {
    const textOnly = (message.parts || [])
      .filter((p: any) => p?.type === 'text')
      .map((p: any) => String(p?.text || ''))
      .join('')
    if (message.role === 'assistant') {
      const { visibleText } = extractReasoningFromThink(textOnly)
      return visibleText
    }
    return textOnly
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
            <div className="group w-full flex flex-col items-end gap-2">
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
              {(() => {
                const copyText = getVisibleTextForCopy(message as any)
                if (!copyText) return null
                return (
                  <Actions className="opacity-0 group-hover:opacity-100 transition-opacity m-0 mt-2">
                    <Action onClick={() => navigator.clipboard.writeText(copyText)} label="Copy">
                      <CopyIcon className="size-4" />
                    </Action>
                  </Actions>
                )
              })()}
            </div>
          </Message>
        ) : (
          <div
            key={message.id}
            className="group w-full flex flex-col gap-2 py-4"
            title={formatTimestampLabel((message as any).metadata?.createdAt)?.tooltip || ''}
          >
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
              const ts = formatTimestampLabel(meta?.createdAt)
              return (
                <div className="flex items-center gap-2">
                  <MessageAvatar src={headerImage} name="AI" />
                  <span className="text-sm font-medium text-muted-foreground">{headerName}</span>
                  {ts && (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground/70">· {ts.label}</span>
                  )}
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
              {(() => {
                const copyText = getVisibleTextForCopy(message as any)
                if (!copyText) return null
                return (
                  <Actions className="ml-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Action onClick={() => navigator.clipboard.writeText(copyText)} label="Copy">
                      <CopyIcon className="size-4" />
                    </Action>
                    <SpeakAction text={copyText} />
                  </Actions>
                )
              })()}
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


