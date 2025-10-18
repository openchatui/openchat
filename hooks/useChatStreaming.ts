"use client"

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Model } from '@/types/model.types'
import type { UIMessage } from 'ai'
import type { MessageMetadata } from '@/lib/modules/chat/chat.types'
import { useChatStore } from '@/lib/modules/chat/chat.client-store'

type StreamHandlers = {
  onStart?: () => void
  onDelta?: (delta: string, fullText: string) => void
  onFinish?: (finalText: string) => void
}

interface UseChatStreamingArgs {
  chatId: string
  initialModels: Model[]
  selectedModel: Model | null
}

export function useChatStreaming({ chatId, initialModels, selectedModel }: UseChatStreamingArgs) {
  const router = useRouter()
  const { addMessage } = useChatStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const resolveModelDisplay = (providerModelId: string, fallback?: Model) => {
    const byId = initialModels.find(m => m.id === providerModelId || (m as any).providerId === providerModelId)
    const name = byId?.name || fallback?.name || providerModelId
    const image = (byId as any)?.meta?.profile_image_url || fallback?.meta?.profile_image_url || '/OpenChat.png'
    return { name, image }
  }

  const handleSendMessage = useCallback(async (
    value: string,
    options: { webSearch: boolean; image: boolean; video?: boolean; codeInterpreter: boolean },
    overrideModel?: Model,
    isAutoSend: boolean = false,
    streamHandlers?: StreamHandlers
  ): Promise<string | null> => {
    const modelToUse = overrideModel || selectedModel
    if (!modelToUse) { toast.error('Please select a model first.'); return null }

    setError(null)
    const providerModelId = (modelToUse as any).providerId || modelToUse.id
    const userMessage: UIMessage<MessageMetadata> = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      role: 'user',
      parts: [{ type: 'text', text: value }],
      metadata: {
        createdAt: Date.now(),
        model: {
          id: providerModelId,
          name: resolveModelDisplay(providerModelId, modelToUse).name,
          profile_image_url: resolveModelDisplay(providerModelId, modelToUse).image || null,
        }
      }
    }

    if (!isAutoSend) {
      addMessage(userMessage)
    }
    setIsLoading(true)

    let assistantTextReturn: string | null = null
    try {
      if (abortControllerRef.current) abortControllerRef.current.abort()
      abortControllerRef.current = new AbortController()

      const state = useChatStore.getState()
      const currentMessages = state.messages

      const body = isAutoSend
        ? { messages: currentMessages, chatId, modelId: providerModelId, enableWebSearch: options.webSearch, enableImage: options.image, enableVideo: Boolean(options.video) }
        : { message: userMessage, chatId, modelId: providerModelId, enableWebSearch: options.webSearch, enableImage: options.image, enableVideo: Boolean(options.video) }

      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')
      const decoder = new TextDecoder()

      let assistantMessage: UIMessage<MessageMetadata> | null = null
      let assistantText = ''
      let hasReceivedTextSnapshot = false
      let reasoningTextCumulative = ''
      let hasReceivedReasoningSnapshot = false
      const getNonOverlappingDelta = (existing: string, delta: string): string => {
        if (!delta) return ''
        const maxOverlap = Math.min(existing.length, delta.length)
        for (let k = maxOverlap; k > 0; k--) {
          if (existing.endsWith(delta.slice(0, k))) return delta.slice(k)
        }
        return delta
      }
      let buffer = ''
      let reachedFinish = false

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split(/\r?\n/)
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            const data = line.slice(line.indexOf(':') + 1).trim()
            if (data === '[DONE]') { reachedFinish = true; setIsLoading(false); break }
            try {
              const parsed = JSON.parse(data)
              const type: string | undefined = parsed?.type
              const isStart = type === 'start' || type === 'response-start'
              const isText = type === 'text' || type === 'text-delta'
              const isFinish = type === 'finish' || type === 'response-end' || type === 'end' || type === 'done'
              const isReasonStart = type === 'reasoning-start'
              const isReasonDelta = type === 'reasoning' || type === 'reasoning-delta' || type === 'reasoning-text'
              const isReasonEnd = type === 'reasoning-end'

              if (isStart) {
                try { streamHandlers?.onStart?.() } catch {}
                assistantMessage = {
                  id: parsed.id || `assistant_${Date.now()}`,
                  role: 'assistant',
                  parts: [{ type: 'text', text: '' }],
                  metadata: {
                    createdAt: Date.now(),
                    model: {
                      id: providerModelId,
                      name: resolveModelDisplay(providerModelId, modelToUse).name,
                      profile_image_url: resolveModelDisplay(providerModelId, modelToUse).image || null,
                    },
                    assistantDisplayName: parsed.metadata?.assistantDisplayName || resolveModelDisplay(providerModelId, modelToUse).name,
                    assistantImageUrl: parsed.metadata?.assistantImageUrl || resolveModelDisplay(providerModelId, modelToUse).image || '/avatars/01.png',
                  } as MessageMetadata
                }
                addMessage(assistantMessage)
                assistantText = ''
                reasoningTextCumulative = ''
                hasReceivedReasoningSnapshot = false
              } else if (isText) {
                if (!assistantMessage) {
                  assistantMessage = {
                    id: parsed.id || `assistant_${Date.now()}`,
                    role: 'assistant',
                    parts: [{ type: 'text', text: '' }],
                    metadata: {
                      createdAt: Date.now(),
                      model: {
                        id: providerModelId,
                        name: resolveModelDisplay(providerModelId, modelToUse).name,
                        profile_image_url: resolveModelDisplay(providerModelId, modelToUse).image || null,
                      },
                      assistantDisplayName: parsed.metadata?.assistantDisplayName || resolveModelDisplay(providerModelId, modelToUse).name,
                      assistantImageUrl: parsed.metadata?.assistantImageUrl || resolveModelDisplay(providerModelId, modelToUse).image || '/avatars/01.png',
                    } as MessageMetadata
                  }
                  addMessage(assistantMessage)
                  assistantText = ''
                }

                const incomingDelta: string | undefined = (parsed as any).delta
                const incomingText: string | undefined = (parsed as any).text
                useChatStore.setState(prev => {
                  const newMessages = [...prev.messages]
                  const last = newMessages[newMessages.length - 1]
                  if (last && last.role === 'assistant') {
                    const textPart = (last as any).parts.find((p: any) => p.type === 'text')
                    if (typeof incomingText === 'string') {
                      assistantText = incomingText
                      hasReceivedTextSnapshot = true
                      textPart.text = assistantText
                      try { streamHandlers?.onDelta?.('', assistantText) } catch {}
                    } else if (typeof incomingDelta === 'string' && !hasReceivedTextSnapshot) {
                      const append = getNonOverlappingDelta(assistantText, incomingDelta)
                      if (append) {
                        assistantText += append
                        textPart.text = assistantText
                        try { streamHandlers?.onDelta?.(append, assistantText) } catch {}
                      }
                    }
                  }
                  return { ...prev, messages: newMessages }
                })
              } else if (isReasonStart || isReasonDelta || isReasonEnd) {
                if (!assistantMessage) {
                  assistantMessage = {
                    id: parsed.id || `assistant_${Date.now()}`,
                    role: 'assistant',
                    parts: [{ type: 'text', text: '' }],
                    metadata: {
                      createdAt: Date.now(),
                      model: {
                        id: providerModelId,
                        name: resolveModelDisplay(providerModelId, modelToUse).name,
                        profile_image_url: resolveModelDisplay(providerModelId, modelToUse).image || null,
                      },
                      assistantDisplayName: parsed.metadata?.assistantDisplayName || resolveModelDisplay(providerModelId, modelToUse).name,
                      assistantImageUrl: parsed.metadata?.assistantImageUrl || resolveModelDisplay(providerModelId, modelToUse).image || '/avatars/01.png',
                      reasoningActive: true,
                    } as MessageMetadata
                  }
                  addMessage(assistantMessage)
                }

                useChatStore.setState(prev => {
                  const newMessages = [...prev.messages]
                  const last: any = newMessages[newMessages.length - 1]
                  if (last && last.role === 'assistant') {
                    last.metadata = { ...(last.metadata || {}), reasoningActive: isReasonEnd ? false : true }
                    let reasoningPart = last.parts.find((p: any) => typeof p?.type === 'string' && p.type.toLowerCase().includes('reason'))
                    if (!reasoningPart) {
                      reasoningPart = { type: 'reasoning', text: '' }
                      last.parts = [reasoningPart, ...last.parts]
                    }
                    const rText: string | undefined = (parsed as any).text
                    const rDelta: string | undefined = (parsed as any).delta
                    if (typeof rText === 'string') {
                      reasoningTextCumulative = rText
                      hasReceivedReasoningSnapshot = true
                      reasoningPart.text = reasoningTextCumulative
                    } else if (typeof rDelta === 'string' && !hasReceivedReasoningSnapshot) {
                      const append = getNonOverlappingDelta(reasoningTextCumulative, rDelta)
                      if (append) {
                        reasoningTextCumulative += append
                        reasoningPart.text = reasoningTextCumulative
                      }
                    }
                  }
                  return { ...prev, messages: newMessages }
                })
              } else if (isFinish) {
                setIsLoading(false)
                try { streamHandlers?.onFinish?.(assistantText) } catch {}
                router.replace(`/c/${chatId}`, { scroll: false })
                reachedFinish = true
                break
              } else if (
                parsed?.type === 'tool-input-start' ||
                parsed?.type === 'tool-input-delta' ||
                parsed?.type === 'tool-input-available' ||
                parsed?.type === 'tool-output-available' ||
                parsed?.type === 'tool-input-error'
              ) {
                if (!assistantMessage) {
                  assistantMessage = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    parts: [{ type: 'text', text: '' }],
                    metadata: {
                      createdAt: Date.now(),
                      model: {
                        id: providerModelId,
                        name: resolveModelDisplay(providerModelId, modelToUse).name,
                        profile_image_url: resolveModelDisplay(providerModelId, modelToUse).image || null,
                      },
                      assistantDisplayName: resolveModelDisplay(providerModelId, modelToUse).name,
                      assistantImageUrl: resolveModelDisplay(providerModelId, modelToUse).image || '/avatars/01.png',
                    } as MessageMetadata
                  }
                  addMessage(assistantMessage)
                }

                const toolName: string = String(parsed.toolName || '')
                const toolCallId: string = String(parsed.toolCallId || '')
                const partType = (`tool-${toolName}`) as any

                useChatStore.setState(prev => {
                  const newMessages = [...prev.messages]
                  let idx = -1
                  for (let i = newMessages.length - 1; i >= 0; i--) {
                    if (newMessages[i].role === 'assistant') { idx = i; break }
                  }
                  if (idx === -1) return prev
                  const msg: any = { ...newMessages[idx] }
                  const parts: any[] = Array.isArray(msg.parts) ? [...msg.parts] : []
                  let toolIdx = parts.findIndex((p: any) => typeof p?.toolCallId === 'string' && p.toolCallId === toolCallId)
                  if (toolIdx === -1) {
                    parts.push({ type: partType, toolCallId, state: 'input-streaming', input: undefined })
                    toolIdx = parts.length - 1
                  }
                  const current = { ...(parts[toolIdx] || {}) }
                  if (parsed.type === 'tool-input-available') {
                    current.type = partType
                    current.toolCallId = toolCallId
                    current.state = 'input-available'
                    current.input = parsed.input
                  } else if (parsed.type === 'tool-output-available') {
                    current.type = partType
                    current.toolCallId = toolCallId
                    current.state = 'output-available'
                    if (current.input === undefined && parsed.input !== undefined) current.input = parsed.input
                    current.output = parsed.output
                  } else if (parsed.type === 'tool-input-error') {
                    current.type = partType
                    current.toolCallId = toolCallId
                    current.state = 'output-error'
                    current.errorText = String(parsed.errorText || 'Tool error')
                    if (parsed.input !== undefined) current.input = parsed.input
                  } else if (parsed.type === 'tool-input-start' || parsed.type === 'tool-input-delta') {
                    current.state = 'input-streaming'
                  }
                  parts[toolIdx] = current
                  msg.parts = parts
                  newMessages[idx] = msg
                  return { ...prev, messages: newMessages }
                })
              }
            } catch {}
          }
          if (reachedFinish) break
        }
      } finally {
        reader.releaseLock()
      }

      assistantTextReturn = assistantText || null
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''))
      if (!isAbort) {
        console.error('Send message error:', err)
        setError(err)
        toast.error('Failed to send message. Please try again.')
        useChatStore.setState(prev => ({ ...prev, messages: prev.messages.slice(0, -1) }))
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
    return assistantTextReturn
  }, [chatId, initialModels, selectedModel])

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [])

  return { handleSendMessage, handleStop, isLoading, error }
}


