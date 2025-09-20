import db from '@/lib/db'

export type RawParamsRecord = Record<string, unknown>

export async function fetchModelParams(input: {
  userId: string
  modelId?: string | null
  selectedModelId?: string | null
  modelName?: string | null
}): Promise<RawParamsRecord> {
  const { userId, modelId, selectedModelId, modelName } = input

  const orClauses = [
    modelId ? { id: modelId } : null,
    selectedModelId ? { id: selectedModelId } : null,
    modelName ? { name: modelName } : null,
  ].filter(Boolean) as Array<{ id?: string; name?: string }>

  if (orClauses.length === 0) return {}

  const m = await db.model.findFirst({
    where: { userId, OR: orClauses },
    select: { params: true, meta: true },
    orderBy: { updatedAt: 'desc' },
  })

  if (!m) return {}
  const params = ((m as any).params || {}) as RawParamsRecord
  const meta = ((m as any).meta || {}) as Record<string, any>

  // Legacy bridge: meta.system_prompt -> params.systemPrompt (only if missing)
  if ((params as any).systemPrompt === undefined) {
    const legacy = meta.system_prompt || meta?.details?.system_prompt
    if (legacy && String(legacy).trim() !== '') {
      ;(params as any).systemPrompt = String(legacy)
    }
  }
  return params
}

export type NormalizedModelParams = {
  temperature?: number
  topP?: number
  topK?: number
  seed?: number
  presencePenalty?: number
  frequencyPenalty?: number
  maxOutputTokens?: number
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'tool'; toolName: string }
  stopSequences?: string[]
  systemPrompt?: string
}

export function normalizeModelParams(raw: RawParamsRecord): NormalizedModelParams {
  const get = (...keys: string[]) => {
    for (const k of keys) if (raw?.[k] !== undefined) return raw[k]
    return undefined
  }
  return {
    temperature: get('temperature') as number | undefined,
    topP: get('topP', 'top_p') as number | undefined,
    topK: get('topK', 'top_k') as number | undefined,
    seed: get('seed') as number | undefined,
    presencePenalty: get('presencePenalty', 'presence_penalty') as number | undefined,
    frequencyPenalty: get('frequencyPenalty', 'frequency_penalty') as number | undefined,
    maxOutputTokens: get('maxOutputTokens', 'max_output_tokens') as number | undefined,
    toolChoice: get('toolChoice', 'tool_choice') as any,
    stopSequences: get('stopSequences', 'stop_sequences', 'stop') as string[] | undefined,
    systemPrompt: get('systemPrompt', 'system_prompt') as string | undefined,
  }
}


