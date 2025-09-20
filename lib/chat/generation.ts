import type { UIMessage } from 'ai'
import type { MessageMetadata } from '@/types/messages'
import type { NormalizedModelParams } from '@/lib/chat/model-params'

export type AdvancedControls = {
  topK?: number
  presencePenalty?: number
  frequencyPenalty?: number
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'tool'; toolName: string }
}

export function mergeGenerationParams(request: {
  temperature?: number
  topP?: number
  maxOutputTokens?: number
  seed?: number
  stopSequences?: string[]
  advanced?: AdvancedControls
}, defaults: NormalizedModelParams) {
  return {
    temperature: request.temperature ?? defaults.temperature,
    topP: request.topP ?? defaults.topP,
    maxOutputTokens: request.maxOutputTokens ?? defaults.maxOutputTokens,
    seed: request.seed ?? defaults.seed,
    stopSequences: request.stopSequences ?? defaults.stopSequences,
    topK: (request.advanced?.topK ?? defaults.topK) as number | undefined,
    presencePenalty: (request.advanced?.presencePenalty ?? defaults.presencePenalty) as number | undefined,
    frequencyPenalty: (request.advanced?.frequencyPenalty ?? defaults.frequencyPenalty) as number | undefined,
    toolChoice: (request.advanced?.toolChoice ?? defaults.toolChoice) as
      | 'auto'
      | 'none'
      | 'required'
      | { type: 'tool'; toolName: string }
      | undefined,
  }
}

export function hasSystemInMessages(messages: UIMessage<MessageMetadata>[]): boolean {
  return messages.some(
    (m) => m.role === 'system' && Array.isArray((m as any).parts) && (m as any).parts.some((p: any) => p?.type === 'text' && String(p.text || '').trim().length > 0)
  )
}

export function systemParamForModel(messages: UIMessage<MessageMetadata>[], fallbackSystem?: string) {
  const hasSystem = hasSystemInMessages(messages)
  return hasSystem ? undefined : (fallbackSystem && String(fallbackSystem).trim()) || undefined
}


