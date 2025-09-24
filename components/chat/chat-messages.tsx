"use client"

import { useRef, useEffect, useState, useCallback } from 'react'
import { Bot, CopyIcon } from 'lucide-react'
import { Actions, Action, SpeakAction } from '@/components/ai/actions'
import { Message, MessageAvatar } from '@/components/ai/message'
import { Response } from '@/components/ai/response'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai/reasoning'
import type { UIMessage } from 'ai'
import { isToolOrDynamicToolUIPart, getToolOrDynamicToolName } from 'ai'
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai/tool'
import { WebPreview, WebPreviewNavigation, WebPreviewUrl, WebPreviewBody } from '@/components/ai/web-preview'
import type { Model } from '@/lib/features/models/model.types'
import { Loader } from '@/components/ui/loader'
import { Image } from '@/components/ai/image'

interface ChatMessagesProps {
  messages: UIMessage[]
  isLoading: boolean
  error?: Error | null
  selectedModel?: Model | null
  // Pre-computed display data to avoid client-side computation
  assistantDisplayName?: string
  assistantImageUrl?: string
  timeZone?: string
  // Optional gating flags (no-ops if not provided)
  toolsAvailable?: boolean
  webSearchAllowed?: boolean
  imageGenerationAllowed?: boolean
}

export default function ChatMessages({
  messages,
  isLoading,
  error,
  assistantDisplayName = 'AI Assistant',
  assistantImageUrl = '/avatars/01.png',
  timeZone = 'UTC',
  toolsAvailable = true,
  webSearchAllowed = true,
  imageGenerationAllowed = true,
}: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  // Simplified: no timers or progress bookkeeping; render streamed reasoning succinctly
  const toolNameCacheRef = useRef<Map<string, string>>(new Map())

  function formatToolLabel(raw?: string): string {
    const input = String(raw || '').trim()
    if (!input) return 'Tool'
    // Normalize separators to spaces
    let s = input.replace(/[._-]+/g, ' ')
    // Insert spaces between camelCase or PascalCase boundaries
    s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    // Collapse multiple spaces
    s = s.replace(/\s+/g, ' ').trim()
    // Lowercase all then capitalize first word
    s = s.toLowerCase()
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  // Use pre-computed values - no client-side computation needed
  const getAssistantDisplayName = () => assistantDisplayName
  const getAssistantImageUrl = () => assistantImageUrl

  // Track whether the user is near the bottom; only auto-scroll in that case
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true)

  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.clientHeight - el.scrollTop
    setIsPinnedToBottom(distanceFromBottom < 80)
  }, [])

  // Auto-scroll to bottom when new messages arrive only if pinned
  useEffect(() => {
    if (isPinnedToBottom && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages, isPinnedToBottom])

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

  // Build reasoning text for a message from <think> blocks and any explicit reasoning parts
  function buildReasoningText(message: UIMessage, isStreaming: boolean): { complete: string; streamingCombined: string; hasAny: boolean } {
    const parts = (message.parts || []) as any[]
    const completeBlocks: string[] = []
    let streamingTail: string = ''

    for (const p of parts) {
      if (p?.type === 'text' && typeof p.text === 'string') {
        const allText: string = p.text
        const completeRegex = /<think>[\s\S]*?<\/think>/g
        const matches = allText.match(completeRegex)
        if (matches && matches.length > 0) {
          for (const block of matches) {
            const reasonText = block.replace('<think>', '').replace('</think>', '').trim()
            if (reasonText) completeBlocks.push(reasonText)
          }
        }
        if (isStreaming && allText.includes('<think>') && !allText.includes('</think>')) {
          const startIdx = allText.lastIndexOf('<think>')
          if (startIdx >= 0) streamingTail = allText.slice(startIdx + '<think>'.length)
        }
      } else if (typeof p?.type === 'string' && p.type.toLowerCase().includes('reason')) {
        const text = typeof p?.text === 'string' ? p.text.trim() : ''
        if (text) completeBlocks.push(text)
      }
    }

    const complete = completeBlocks.join('\n\n').trim()
    const streamingCombined = (complete + (streamingTail ? (complete ? '\n\n' : '') + streamingTail : '')).trim()
    return { complete, streamingCombined, hasAny: Boolean(streamingCombined.length > 0) }
  }

  function lastNLines(input: string, n: number): string {
    const lines = input.split(/\r?\n/)
    if (lines.length <= n) return input
    return lines.slice(-n).join('\n')
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
      onScroll={handleScroll}
      className="w-full h-full flex-1 min-h-0 overflow-y-auto pt-16"
    >
      <div className="max-w-5xl px-2.5 mx-auto space-y-6" style={{ paddingBottom: 'calc(185px)' }}>
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
                      <Response className="prose prose-lg leading-normal prose-invert max-w-none prose-p:mt-2 prose-p:mb-2 prose-pre:my-3 prose-li:my-1">
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
            {(() => {
              // Prefer rendering images directly for image tools; fall back to web preview for other URLs
              const toolParts = (message.parts || []).filter((p: any) => isToolOrDynamicToolUIPart(p as any)) as any[]

              const getToolName = (p: any): string => {
                try {
                  const extracted = getToolOrDynamicToolName(p as any) as string
                  if (typeof extracted === 'string' && extracted.trim().length > 0) return extracted.trim()
                } catch {}
                const candidates = [p?.toolName, p?.name, p?.tool, p?.input?.toolName, p?.input?.name, p?.input?.tool]
                for (const c of candidates) {
                  if (typeof c === 'string' && c.trim().length > 0) return c.trim()
                }
                return ''
              }

              const isImageToolPart = (p: any) => {
                const name = getToolName(p)
                if (name === 'generateImage') return true
                const summary = typeof p?.output?.summary === 'string' ? p.output.summary.toLowerCase() : ''
                // Heuristic: our image tool summaries start with 'image generated'
                if (summary.includes('image generated')) return true
                const detailsModel = (p?.output?.details && typeof p.output.details.model === 'string') ? String(p.output.details.model).toLowerCase() : ''
                if (detailsModel === 'gpt-image-1' || detailsModel === 'dall-e-3') return true
                return false
              }

              // Handle image generation tool: show loader while running, show image when available
              const latestImagePart = (toolsAvailable && imageGenerationAllowed)
                ? ([...toolParts].reverse().find((p: any) => isImageToolPart(p)) as any)
                : undefined
              if (latestImagePart) {
                const state: string | undefined = latestImagePart?.state
                const imageUrl: string | undefined = typeof latestImagePart?.output?.url === 'string' ? latestImagePart.output.url : undefined
                if (!imageUrl && (state === 'input-streaming' || state === 'input-available')) {
                  return (
                    <div className="mb-3 flex items-center justify-center w-full max-w-[1024px] h-[256px] rounded-lg bg-muted/30 border">
                      <Loader className="h-8 w-8" />
                    </div>
                  )
                }
                if (imageUrl) {
                  return (
                    <div className="mb-3 rounded-lg overflow-hidden border">
                      <Image src={imageUrl} alt="Generated image" />
                    </div>
                  )
                }
              }

              const latestWithUrl = (toolsAvailable && webSearchAllowed) ? ([...toolParts].reverse().find((p: any) => {
                if (isImageToolPart(p)) return false // handled above
                const outUrl = (p as any)?.output && typeof (p as any).output?.url === 'string' && (p as any).output.url
                const inUrl = (p as any)?.input && typeof (p as any).input?.url === 'string' && (p as any).input.url
                return Boolean(outUrl || inUrl)
              }) as any) : undefined
              const url: string | undefined = (latestWithUrl?.output?.url as string) || (latestWithUrl?.input?.url as string)
              if (!url) return null
              return (
                <div className="mb-3 rounded-lg overflow-hidden border max-h-[600px]">
                  <WebPreview defaultUrl={url}>
                    <WebPreviewNavigation>
                      <WebPreviewUrl />
                    </WebPreviewNavigation>
                    <WebPreviewBody />
                  </WebPreview>
                </div>
              )
            })()}
              {/* Simplified reasoning: show last lines with fade while streaming; full after */}
              {(() => {
                const isLatestAssistant = lastAssistantMessageId === message.id
                const isStreaming = Boolean(isLatestAssistant && isLoading)
                const { complete, streamingCombined, hasAny } = buildReasoningText(message as any, isStreaming)
                if (!hasAny) return null
                const STREAMING_MAX_LINES = 12
                const displayed = isStreaming ? lastNLines(streamingCombined, STREAMING_MAX_LINES) : complete
                return (
                  <div className="relative mb-3">
                    <Reasoning isStreaming={isStreaming} defaultOpen>
                      <ReasoningTrigger />
                      <ReasoningContent className='text-muted-foreground whitespace-pre-wrap'>
                        {displayed}
                      </ReasoningContent>
                    </Reasoning>
                  </div>
                )
              })()}

              {/* Render tool UI parts (non-image) in order, simplified */}
              {(() => {
                const parts = (message.parts || []) as any[]
                const toolPartsOnly = parts.filter((p: any) => isToolOrDynamicToolUIPart(p as any))
                if (toolPartsOnly.length === 0) return null

                const resolveToolName = (part: any): string | undefined => {
                  const direct = typeof part?.toolName === 'string' ? part.toolName : undefined
                  if (direct && direct.trim()) return direct.trim()
                  const fromProvider = typeof part?.providerMetadata?.openai?.toolName === 'string' ? part.providerMetadata.openai.toolName : undefined
                  if (fromProvider && fromProvider.trim()) return fromProvider.trim()
                  const fromInput = typeof part?.input?.toolName === 'string' ? part.input.toolName : undefined
                  if (fromInput && fromInput.trim()) return fromInput.trim()
                  const fromOutput = typeof part?.output?.toolName === 'string' ? part.output.toolName : undefined
                  if (fromOutput && fromOutput.trim()) return fromOutput.trim()
                  const candidates = [part?.name, part?.tool, part?.input?.name, part?.input?.tool]
                  for (const c of candidates) {
                    if (typeof c === 'string' && c.trim().length > 0) return c.trim()
                  }
                  try {
                    const extracted = getToolOrDynamicToolName(part as any) as string
                    if (typeof extracted === 'string' && extracted.trim().length > 0) return extracted.trim()
                  } catch {}
                  return undefined
                }
                return (
                  <div className="flex flex-col gap-3">
                    {toolPartsOnly.map((part: any, idx: number) => {
                      const partType = (part as any).type as `tool-${string}` | 'dynamic-tool'
                      const state = (part as any).state
                      const input = (part as any).input
                      const output = (part as any).output
                      const errorText = (part as any).errorText
                      const callId = (part as any)?.toolCallId as string | undefined
                      let toolName: string | undefined = callId ? toolNameCacheRef.current.get(callId) : undefined
                      if (!toolName) toolName = resolveToolName(part)
                      if (!toolName && typeof partType === 'string') toolName = partType.replace(/^tool-/, '')
                      if (!toolName) toolName = 'Tool'
                      if (callId && toolName) {
                        toolNameCacheRef.current.set(callId, toolName)
                      }

                      // Special handling for image tool: skip here (already previewed above)
                      const summary = typeof (output as any)?.summary === 'string' ? String((output as any).summary).toLowerCase() : ''
                      const detailsModel = (output as any)?.details && typeof (output as any).details?.model === 'string'
                        ? String((output as any).details.model).toLowerCase()
                        : ''
                      if (toolName === 'generateImage' || summary.includes('image generated') || detailsModel === 'gpt-image-1' || detailsModel === 'dall-e-3') {
                        return null
                      }

                      return (
                        <Tool key={`${message.id}_tool_${callId || idx}`} defaultOpen={state === 'output-error'}>
                          <ToolHeader type={partType as any} state={state} label={formatToolLabel(toolName)} />
                          <ToolContent>
                            <ToolInput input={input} />
                            {(() => {
                              const displayedOutput = (output && typeof output === 'object' && 'summary' in (output as any))
                                ? (output as any).summary
                                : output
                              return (
                                <ToolOutput output={displayedOutput} errorText={errorText} />
                              )
                            })()}
                          </ToolContent>
                        </Tool>
                      )
                    })}
                  </div>
                )
              })()}
              {/* AI message text below */
              }
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
                      <Response className="prose prose-lg leading-normal max-w-none prose-p:mt-2 prose-p:mb-2 prose-pre:my-3 prose-li:my-1">
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


