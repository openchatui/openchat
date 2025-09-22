"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { UIMessage } from 'ai';
import { useRouter, useSearchParams } from "next/navigation"
import {
  SidebarInset,
} from "@/components/ui/sidebar"
import { ChatInput } from "@/components/chat/chat-input"
import { ModelSelector } from "@/components/chat/model-selector"
import { Session } from "next-auth"
import { toast } from 'sonner'
import ChatMessages from "./chat-messages"
import { Loader } from "@/components/ui/loader"
import type { Model } from "@/types/models"
import type { ChatData } from "@/lib/chat/chat-store"
import { loadChatMessages } from "@/actions/chat"
import type { MessageMetadata } from "@/types/messages"

interface ChatClientProps {
  session: Session | null
  chatId: string
  initialMessages?: UIMessage[]
  initialChats?: ChatData[]
  initialModels?: Model[]
  pinnedModels?: Model[]
  assistantDisplayName?: string
  assistantImageUrl?: string
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

export default function ChatClient({
  session,
  chatId,
  initialMessages = [],
  initialChats = [],
  initialModels = [],
  pinnedModels = [],
  assistantDisplayName = 'AI Assistant',
  assistantImageUrl = '/avatars/01.png',
  timeZone = 'UTC',
  webSearchAvailable = true,
  imageAvailable = true,
  permissions
}: ChatClientProps) {
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  // Use server-loaded models
  const effectiveModels = initialModels
  const effectiveModelsLoading = false // Models are pre-loaded on server

  // Prefer message history for assistant display info; fallback to selected model, then server defaults
  const getAssistantDisplayInfo = () => {
    // Find last assistant message with metadata
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i] as any
      if (msg?.role === 'assistant') {
        const meta = msg?.metadata || {}
        const name = (meta.assistantDisplayName && meta.assistantDisplayName !== 'Unknown Model')
          ? meta.assistantDisplayName
          : (meta?.model?.name || '')
          || selectedModel?.name
          || assistantDisplayName
        const imageUrl = (meta.assistantImageUrl && typeof meta.assistantImageUrl === 'string')
          ? meta.assistantImageUrl
          : (meta?.model?.profile_image_url || '')
          || selectedModel?.meta?.profile_image_url
          || assistantImageUrl
        return { displayName: name, imageUrl }
      }
    }
    return {
      displayName: selectedModel?.name || assistantDisplayName,
      imageUrl: selectedModel?.meta?.profile_image_url || assistantImageUrl
    }
  }

  const [messages, setMessages] = useState<UIMessage[]>(initialMessages)

  // Get assistant display info (pre-computed server-side)
  const assistantInfo = getAssistantDisplayInfo()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasSentInitialMessageRef = useRef(false)

  // Find the current model details from the models list
  const currentModel = selectedModel
    ? effectiveModels.find(m => m.id === selectedModel.id || (m as any).providerId === selectedModel.id) || null
    : null

  const resolveModelDisplay = (providerModelId: string, fallback?: Model) => {
    const byId = effectiveModels.find(m => m.id === providerModelId || (m as any).providerId === providerModelId)
    const name = byId?.name || fallback?.name || providerModelId
    const image = (byId as any)?.meta?.profile_image_url || fallback?.meta?.profile_image_url || '/OpenChat.png'
    return { name, image }
  }

  // Load messages on mount if not provided
  useEffect(() => {
    if (initialMessages.length === 0) {
      loadChatMessages(chatId)
        .then((loadedMessages) => {
          setMessages(loadedMessages)
        })
        .catch((err) => {
          console.error('Failed to load messages:', err)
          setError(err)
        })
    }
  }, [chatId, initialMessages.length])

  // Reset the initial message sent flag when chatId changes
  useEffect(() => {
    hasSentInitialMessageRef.current = false
  }, [chatId])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Handle initialization state
  useEffect(() => {
    if (!effectiveModelsLoading && effectiveModels.length > 0) {
      setIsInitializing(false)
    }
  }, [effectiveModelsLoading, effectiveModels.length])

  // Initialize selected model from messages
  useEffect(() => {
    if (!selectedModel && messages.length > 0 && effectiveModels.length > 0) {
      // First try to find model from the last user message (for new chats)
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i]
        if (message.role === 'user') {
          const meta = (message as any).metadata
          if (meta?.model?.id) {
            const model = effectiveModels.find(m => m.id === meta.model.id || (m as any).providerId === meta.model.id)
            if (model) {
              setSelectedModel(model)
              break
            }
          }
        }
      }

      // If no user message model found, try assistant messages
      if (!selectedModel) {
        for (let i = messages.length - 1; i >= 0; i--) {
          const message = messages[i]
          if (message.role === 'assistant') {
            const meta = (message as any).metadata
            if (meta?.model?.id) {
              const model = effectiveModels.find(m => m.id === meta.model.id || (m as any).providerId === meta.model.id)
              if (model) {
                setSelectedModel(model)
                break
              }
            }
          }
        }
      }
    }
  }, [selectedModel, messages, effectiveModels])

  // Auto-send message if we have only user messages (no assistant responses yet)
  useEffect(() => {
    if (!hasSentInitialMessageRef.current && messages.length > 0 && !isLoading && effectiveModels.length > 0 && !isInitializing) {
      const hasAssistantMessage = messages.some(msg => msg.role === 'assistant')
      if (!hasAssistantMessage) {
        // Find the last user message
        for (let i = messages.length - 1; i >= 0; i--) {
          const message = messages[i]
          if (message.role === 'user') {
            const textContent = message.parts.find(part => part.type === 'text') as any
            if (textContent?.text) {
              // Get the model from message metadata
              const meta = (message as any).metadata
              if (meta?.model?.id) {
                const model = effectiveModels.find(m => m.id === meta.model.id || (m as any).providerId === meta.model.id)
                if (model) {
                  // Send the message to get assistant response (pass model directly to avoid state timing issues)
                  hasSentInitialMessageRef.current = true
                  let webSearchFromStorage = false
                  let imageFromStorage = false
                  try {
                    const raw = sessionStorage.getItem(`chat-input-${chatId}`)
                    if (raw) {
                      const data = JSON.parse(raw)
                      webSearchFromStorage = Boolean(data?.webSearchEnabled)
                      imageFromStorage = Boolean(data?.imageGenerationEnabled)
                    }
                  } catch {}
                  handleSendMessage(textContent.text, { webSearch: webSearchFromStorage, image: imageFromStorage, codeInterpreter: false }, model, true)
                  // Also update the selected model state for UI consistency
                  if (!selectedModel) {
                    setSelectedModel(model)
                  }
                }
              }
              break
            }
          }
        }
      }
    }
  }, [messages, isLoading, selectedModel, effectiveModels, isInitializing])

  const handleModelSelect = (model: Model) => {
    setSelectedModel(model)
  }

  type StreamHandlers = {
    onStart?: () => void
    onDelta?: (delta: string, fullText: string) => void
    onFinish?: (finalText: string) => void
  }

  const handleSendMessage = useCallback(async (
    value: string,
    options: {
      webSearch: boolean
      image: boolean
      codeInterpreter: boolean
    },
    overrideModel?: Model,
    isAutoSend: boolean = false,
    streamHandlers?: StreamHandlers
  ): Promise<string | null> => {
    const modelToUse = overrideModel || selectedModel

    if (!modelToUse) {
      toast.error('Please select a model first.')
      return null
    }

    // Clear any previous errors
    setError(null)

    // Create the user message
    const providerModelId = (modelToUse as any).providerId || modelToUse.id
    const userMessage: UIMessage<MessageMetadata> = {
      id: `msg_${Date.now()}`,
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

    // Optimistically add the user message (only for new messages, not auto-send)
    if (!isAutoSend) {
      setMessages(prev => [...prev, userMessage])
    }
    setIsLoading(true)

    let assistantTextReturn: string | null = null
    try {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController()

      // Build request body: use full messages for first auto-send to avoid duplication
      const requestBody = isAutoSend
        ? { messages, chatId, modelId: providerModelId, enableWebSearch: options.webSearch, enableImage: options.image }
        : { message: userMessage, chatId, modelId: providerModelId, enableWebSearch: options.webSearch, enableImage: options.image }

      // Call the API route directly for streaming
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(requestBody),
        cache: 'no-store',
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()

      let assistantMessage: UIMessage<MessageMetadata> | null = null
      // Track assistant cumulative text to avoid duplicated tokens when both text and text-delta are emitted
      let assistantText = ''
      let hasReceivedTextSnapshot = false
      // Track reasoning cumulative text and snapshot guard as well
      let reasoningTextCumulative = ''
      let hasReceivedReasoningSnapshot = false
      const getNonOverlappingDelta = (existing: string, delta: string): string => {
        if (!delta) return ''
        // Find the longest suffix of existing that is a prefix of delta
        const maxOverlap = Math.min(existing.length, delta.length)
        for (let k = maxOverlap; k > 0; k--) {
          if (existing.endsWith(delta.slice(0, k))) {
            return delta.slice(k)
          }
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
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.slice(line.indexOf(':') + 1).trim()
              if (data === '[DONE]') {
                reachedFinish = true
                setIsLoading(false)
                break
              }

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
                  // Create assistant message when streaming starts
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
                      // Store assistant display info from the start event
                      assistantDisplayName: parsed.metadata?.assistantDisplayName || resolveModelDisplay(providerModelId, modelToUse).name,
                      assistantImageUrl: parsed.metadata?.assistantImageUrl || resolveModelDisplay(providerModelId, modelToUse).image || '/avatars/01.png',
                    } as MessageMetadata
                  }
                  setMessages(prev => [...prev, assistantMessage!])
                  assistantText = ''
                  // reset reasoning trackers at the start of a step
                  reasoningTextCumulative = ''
                  hasReceivedReasoningSnapshot = false
                } else if (isText) {
                  // Lazily create assistant message on first text chunk if needed
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
                    setMessages(prev => [...prev, assistantMessage!])
                    assistantText = ''
                  }

                  // Update assistant message with new text
                  setMessages(prev => {
                    const newMessages = [...prev]
                    const lastMessage = newMessages[newMessages.length - 1]
                    if (lastMessage && lastMessage.role === 'assistant') {
                      const textPart = lastMessage.parts.find(p => p.type === 'text') as any
                      if (textPart) {
                        const incomingDelta: string | undefined = (parsed as any).delta
                        const incomingText: string | undefined = (parsed as any).text
                        if (typeof incomingText === 'string') {
                          // Full snapshot mode from provider (authoritative)
                          assistantText = incomingText
                          hasReceivedTextSnapshot = true
                          textPart.text = assistantText
                          try { streamHandlers?.onDelta?.('', assistantText) } catch {}
                        } else if (typeof incomingDelta === 'string') {
                          // Delta mode with overlap guard
                          if (!hasReceivedTextSnapshot) {
                            const append = getNonOverlappingDelta(assistantText, incomingDelta)
                            if (append) {
                              assistantText += append
                              textPart.text = assistantText
                              try { streamHandlers?.onDelta?.(append, assistantText) } catch {}
                            }
                          }
                        }
                      }
                    }
                    return newMessages
                  })
                } else if (isReasonStart || isReasonDelta || isReasonEnd) {
                  // Handle reasoning stream updates
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
                    setMessages(prev => [...prev, assistantMessage!])
                  }

                  setMessages(prev => {
                    const newMessages = [...prev]
                    const lastMessage = newMessages[newMessages.length - 1] as any
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.metadata = {
                        ...(lastMessage.metadata || {}),
                        reasoningActive: isReasonEnd ? false : true,
                      }

                      // Maintain or create reasoning part
                      let reasoningPart = lastMessage.parts.find((p: any) => typeof p?.type === 'string' && p.type.toLowerCase().includes('reason')) as any
                      if (!reasoningPart) {
                        reasoningPart = { type: 'reasoning', text: '' }
                        lastMessage.parts = [reasoningPart, ...lastMessage.parts]
                      }
                      const rText: string | undefined = (parsed as any).text
                      const rDelta: string | undefined = (parsed as any).delta
                      if (typeof rText === 'string') {
                        // full snapshot overrides incremental deltas
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
                    return newMessages
                  })
                } else if (isFinish) {
                  // Streaming finished
                  reachedFinish = true
                  setIsLoading(false)
                  try { streamHandlers?.onFinish?.(assistantText) } catch {}
                  break
                } else if (
                  parsed?.type === 'tool-input-start' ||
                  parsed?.type === 'tool-input-delta' ||
                  parsed?.type === 'tool-input-available' ||
                  parsed?.type === 'tool-output-available' ||
                  parsed?.type === 'tool-input-error'
                ) {
                  // Ensure assistant message exists
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
                    setMessages(prev => [...prev, assistantMessage!])
                  }

                  const toolName: string = String(parsed.toolName || '')
                  const toolCallId: string = String(parsed.toolCallId || '')
                  const partType = (`tool-${toolName}`) as any

                  setMessages(prev => {
                    const newMessages = [...prev]
                    // Find last assistant message to update
                    let idx = -1
                    for (let i = newMessages.length - 1; i >= 0; i--) {
                      if (newMessages[i].role === 'assistant') { idx = i; break }
                    }
                    if (idx === -1) return newMessages
                    const msg: any = { ...newMessages[idx] }
                    const parts: any[] = Array.isArray(msg.parts) ? [...msg.parts] : []
                    // Find existing tool part by toolCallId
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
                      // Keep previous input if present
                      if (current.input === undefined && parsed.input !== undefined) current.input = parsed.input
                      current.output = parsed.output
                    } else if (parsed.type === 'tool-input-error') {
                      current.type = partType
                      current.toolCallId = toolCallId
                      current.state = 'output-error'
                      current.errorText = String(parsed.errorText || 'Tool error')
                      if (parsed.input !== undefined) current.input = parsed.input
                    } else if (parsed.type === 'tool-input-start' || parsed.type === 'tool-input-delta') {
                      // Keep as streaming; wait for available event
                      current.state = 'input-streaming'
                    }
                    parts[toolIdx] = current
                    msg.parts = parts
                    newMessages[idx] = msg
                    return newMessages
                  })
                }
              } catch (e) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
          if (reachedFinish) {
            break
          }
        }
      } finally {
        reader.releaseLock()
      }

      // After streaming completes, return the final assistant text if any
      assistantTextReturn = assistantText ? assistantText : null

    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || /aborted/i.test(String(err?.message || ''))
      if (!isAbort) {
        console.error('Send message error:', err)
        setError(err)
        toast.error('Failed to send message. Please try again.')
        // Remove the optimistic user message on error
        setMessages(prev => prev.slice(0, -1))
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
    return assistantTextReturn
  }, [selectedModel, chatId])

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [])

  // Show loading state during initialization
  if (isInitializing || effectiveModelsLoading) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center h-full">
          <Loader className="h-10 w-10 text-center" />
        </div>
      </SidebarInset>
    )
  }

  return (
    <SidebarInset>
      <div className="relative flex flex-col h-full">
        <ModelSelector
          selectedModelId={currentModel?.id}
          onModelSelect={handleModelSelect}
          models={effectiveModels}
        />

        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0">
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              error={error}
              selectedModel={currentModel}
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

