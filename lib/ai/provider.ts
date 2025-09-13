import db from '@/lib/db'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOllama } from 'ollama-ai-provider-v2'

type SupportedProvider = 'openai' | 'openrouter' | 'ollama' | 'openai-compatible'

interface ProviderResolutionInput {
  /**
   * Incoming model identifier. The resolver will try in order:
   * 1) Models.provider_id == model
   * 2) Models.id == model (namespaced id)
   * 3) Models.name == model
   */
  model?: string
}

interface ProviderResolutionResult {
  providerName: SupportedProvider
  /** function to obtain a model handle for ai.streamText */
  getModelHandle: (providerModelId: string) => any
  /** provider-specific model id to pass to provider */
  providerModelId: string
  /** base URL used for the provider */
  baseUrl?: string
}

async function getConnectionForProvider(provider: SupportedProvider): Promise<{ baseUrl?: string; apiKey?: string | null } | null> {
  // Only select by Connection.provider per latest requirements
  const byProvider = await (db as any).connection.findFirst({
    where: { provider },
    select: { baseUrl: true, apiKey: true },
  })
  return byProvider || null
}

function normalizeProviderName(raw?: string | null): SupportedProvider | null {
  const name = String(raw || '').toLowerCase()
  if (!name) return null
  if (name.includes('openrouter')) return 'openrouter'
  if (name.includes('ollama')) return 'ollama'
  if (name.includes('openai')) return 'openai'
  if (name.includes('compatible')) return 'openai-compatible'
  return null
}

function inferProviderFromHints(hint?: string | null): SupportedProvider | null {
  const s = String(hint || '').toLowerCase()
  if (!s) return null
  if (s.includes('ollama') || s.includes('11434') || s.includes('localhost')) return 'ollama'
  if (s.includes('openrouter')) return 'openrouter'
  if (s.includes('openai') || s.includes('/v1')) return 'openai'
  return null
}

/**
 * Resolve which AI SDK provider to use and the correct provider model id.
 * - If providerId is provided, try to find model by providerId first.
 * - Otherwise try to find by model id (primary key) or by name.
 * - Falls back to OpenAI if nothing is found.
 */
export async function resolveAiProvider(input: ProviderResolutionInput): Promise<ProviderResolutionResult> {
  const requestedModel = input.model && String(input.model).trim().length > 0 ? String(input.model).trim() : 'gpt-4o-mini'

  // Attempt to locate a model row primarily by provider_id
  const modelRow = await db.model.findFirst({
    where: {
      OR: [
        { providerId: requestedModel },
        { id: requestedModel },
        { name: requestedModel },
      ],
    },
    select: { name: true, provider: true, meta: true, providerId: true },
  })

  // Determine provider from Models.provider first, else infer from providerId/name
  const inferredProvider: SupportedProvider =
    normalizeProviderName(modelRow?.provider) ||
    inferProviderFromHints(modelRow?.providerId || modelRow?.name || requestedModel) ||
    'openai'

  // Determine provider-specific model id (what the provider expects)
  const providerModelId =
    (modelRow?.meta as any)?.provider_model_id ||
    modelRow?.providerId ||
    modelRow?.name ||
    requestedModel

  const connection = await getConnectionForProvider(inferredProvider)
  if (!connection) {
    throw new Error(`No connection configured for provider '${inferredProvider}'.`)
  }
  // Validate API key presence when required
  const requiresKey = inferredProvider === 'openai' || inferredProvider === 'openai-compatible' || inferredProvider === 'openrouter'
  if (requiresKey && (!connection?.apiKey || String(connection.apiKey).trim() === '')) {
    throw new Error(`Missing API key for provider '${inferredProvider}'. Add a connection with an apiKey.`)
  }

  // Build provider factory
  if (inferredProvider === 'ollama') {
    const raw = (connection?.baseUrl || 'http://localhost:11434').trim()
    const trimmed = raw.replace(/\/+$/, '')
    const withApi = /\/api\/?$/.test(trimmed) ? trimmed : `${trimmed}/api`
    const ollama = createOllama({ baseURL: withApi })
    return {
      providerName: 'ollama',
      getModelHandle: (id: string) => ollama(id),
      providerModelId,
      baseUrl: withApi,
    }
  }

  if (inferredProvider === 'openrouter') {
    const openrouter = createOpenRouter({
      apiKey: connection?.apiKey || undefined,
      ...(connection?.baseUrl ? { baseURL: connection.baseUrl } : {}),
    })
    return {
      providerName: 'openrouter',
      getModelHandle: (id: string) => openrouter(id),
      providerModelId,
      baseUrl: connection?.baseUrl || 'https://openrouter.ai/api/v1',
    }
  }

  // Default to OpenAI-compatible
  const openai = createOpenAI({
    apiKey: connection?.apiKey || undefined,
    baseURL: connection?.baseUrl || undefined,
  })
  return {
    providerName: (inferredProvider === 'openai-compatible' ? 'openai-compatible' : 'openai'),
    getModelHandle: (id: string) => openai(id),
    providerModelId,
    baseUrl: connection?.baseUrl,
  }
}


