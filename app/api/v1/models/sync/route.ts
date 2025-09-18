import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth/auth'
import fs from 'fs/promises'
import path from 'path'

/**
 * @swagger
 * /api/v1/models/sync:
 *   post:
 *     tags: [Models]
 *     summary: Sync models from a provider (OpenAI/Ollama)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               baseUrl:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [openai-api, ollama]
 *               apiKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Models synced
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to sync models
 */

type ProviderType = 'openai-api' | 'ollama'

interface SyncRequestBody {
  baseUrl: string
  type?: ProviderType
  apiKey?: string | null
}

function toUnixSeconds(date: number | Date = Date.now()): number {
  return Math.floor((typeof date === 'number' ? date : date.getTime()) / 1000)
}

function inferProviderType(baseUrl: string): ProviderType | null {
  const url = baseUrl.toLowerCase()
  if (url.includes('openai.com') || url.endsWith('/v1') || url.includes('/v1/')) return 'openai-api'
  if (url.includes('ollama') || url.includes('localhost:11434')) return 'ollama'
  return null
}

function inferOwnership(baseUrl: string): string {
  const url = baseUrl.toLowerCase()

  // OpenAI and compatible services
  if (url.includes('openai.com')) return 'openai'
  if (url.includes('openrouter.ai')) return 'openrouter'
  if (url.includes('x.ai')) return 'xai'
  if (url.includes('anthropic.com')) return 'anthropic'
  if (url.includes('together.xyz')) return 'together'
  if (url.includes('replicate.com')) return 'replicate'
  if (url.includes('huggingface.co')) return 'huggingface'

  // Ollama
  if (url.includes('ollama') || url.includes('localhost:11434')) return 'ollama'

  // Generic OpenAI-compatible APIs
  if (url.includes('/v1') || url.includes('api/')) return 'openai-compatible'

  // Default fallback
  return 'unknown'
}

// Compute a namespace from provider base URL
// - For public hosts: use second-level domain (e.g., openrouter.ai -> "openrouter", api.openai.com -> "openai")
// - For localhost: use the port number (e.g., http://localhost:11434 -> "11434"); default to 80/443 if absent
function computeModelNamespace(baseUrl: string): string {
  try {
    const u = new URL(baseUrl)
    const host = u.hostname.toLowerCase()
    
    // Use second-level domain as namespace (domain names only)
    const parts = host.split('.').filter(Boolean)
    if (parts.length >= 2) return parts[parts.length - 2]
    return parts[0] || host
  } catch {
    // Fallback: try to salvage a simple token
    return 'external'
  }
}

// Lazy-load and cache local model logos mapping from public/model-logos-local.json
let modelLogosCache: Record<string, string | null> | null = null

async function loadModelLogos(): Promise<Record<string, string | null>> {
  if (modelLogosCache) return modelLogosCache
  try {
    const filePath = path.join(process.cwd(), 'public', 'model-logos.json')
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(fileContent)
    if (parsed && typeof parsed === 'object') {
      modelLogosCache = parsed as Record<string, string | null>
      return modelLogosCache
    }
  } catch (err) {
    console.error('Failed to load model-logos-local.json:', err)
  }
  modelLogosCache = {}
  return modelLogosCache
}

async function findLogoUrlForModel(modelName: string): Promise<string | null> {
  const logos = await loadModelLogos()
  const normalized = String(modelName ?? '').toLowerCase().replace(/_/g, '-')

  // Exact (case-insensitive) match first
  for (const [rawKey, value] of Object.entries(logos)) {
    if (normalized === rawKey.toLowerCase()) {
      return typeof value === 'string' && value.length > 0 ? value : null
    }
  }

  // Longest substring match fallback (e.g., match 'gpt' in 'gpt-4o-2024-05-13')
  const keys = Object.keys(logos).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    const keyLc = key.toLowerCase()
    if (keyLc && normalized.includes(keyLc)) {
      const url = logos[key]
      if (typeof url === 'string' && url.length > 0) return url
    }
  }

  return null
}

async function fetchOpenAIModels(baseUrl: string, apiKey?: string | null) {
  const url = baseUrl.replace(/\/$/, '') + '/models'
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
    },
  })
  if (!response.ok) {
    throw new Error(`OpenAI models request failed: ${response.status} ${response.statusText}`)
  }
  const data = await response.json()
  const list = Array.isArray(data?.data) ? data.data : []

  // Filter out non-chat models
  const nonChatModelKeywords = ['dalle', 'dall-e', 'tts', 'audio', 'computer-use', 'babbage', 'realtime-preview','davinci','text-embedding','whisper','codex','omni','image','realtime'
  ]
  const filteredList = list.filter((m: any) => {
    const modelId = String(m.id ?? m.name ?? '').toLowerCase()
    return !nonChatModelKeywords.some(keyword => modelId.includes(keyword))
  })

  return filteredList.map((m: any) => ({
    id: String(m.id ?? m.name ?? ''),
    name: String(m.id ?? m.name ?? ''),
    meta: m,
    params: {},
  }))
}

async function fetchOllamaModels(baseUrl: string, apiKey?: string | null) {
  const url = baseUrl.replace(/\/$/, '') + '/api/tags'
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }

  // Add API key if provided and not empty
  if (apiKey && apiKey.trim() !== '') {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })
  if (!response.ok) {
    throw new Error(`Ollama tags request failed: ${response.status} ${response.statusText}`)
  }
  const data = await response.json()
  const list = Array.isArray(data?.models) ? data.models : []
  return list.map((m: any) => ({
    id: String(m?.name ?? ''),
    name: String(m?.name ?? ''),
    meta: m,
    params: {},
  }))
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as SyncRequestBody
    if (!body?.baseUrl) {
      return NextResponse.json({ error: 'Base URL is required' }, { status: 400 })
    }

    const baseUrl = body.baseUrl.trim()
    try { new URL(baseUrl) } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const provider: ProviderType | null = body.type ?? inferProviderType(baseUrl)
    if (!provider) {
      return NextResponse.json({ error: 'Unable to infer provider type. Provide type.' }, { status: 400 })
    }

    const apiKey = body.apiKey ?? null
    const ollamaNamespace = typeof (body as any).ollama === 'string' && (body as any).ollama.trim() ? (body as any).ollama.trim() : null
    let models: Array<{ id: string, name: string, meta: any, params: any }>
    if (provider === 'openai-api') {
      models = await fetchOpenAIModels(baseUrl, apiKey)
    } else {
      models = await fetchOllamaModels(baseUrl, apiKey)
    }

    const now = toUnixSeconds()

    const baseNamespace = computeModelNamespace(baseUrl)
    const namespace = provider === 'ollama' ? 'ollama' : (ollamaNamespace || baseNamespace)

    const upserts = await Promise.all(models.map(async (m) => {
      if (!m.id) return null

      // Determine ownership based on provider type and base URL
      const ownedBy = provider === 'ollama' ? 'ollama' : inferOwnership(baseUrl)

      // Enhance meta with specific fields + details containing original metadata
      const logoUrl = (await findLogoUrlForModel(m.name)) || m.meta?.profile_image_url || null
      const enhancedMeta = {
        // Keep these specific fields at top level
        profile_image_url: logoUrl || "/OpenChat.png",
        description: m.meta?.description || null,
        tags: m.meta?.tags || null,
        tools: m.meta?.tools || null,
        ownedBy: m.meta?.ownedBy || ownedBy,
        provider_model_id: m.id,
        // Put all original Ollama/OpenAI metadata in details
        details: m.meta || {}
      }

      const namespacedId = `${namespace}/${m.id}`

      return db.model.upsert({
        where: { id: namespacedId },
        update: {
          name: m.name,
          meta: enhancedMeta,
          params: m.params,
          updatedAt: now,
          isActive: true,
          providerId: m.id,
          provider: ownedBy,
          userId: userId,
        },
        create: {
          id: namespacedId,
          userId: userId,
          providerId: m.id,
          provider: ownedBy,
          name: m.name,
          meta: enhancedMeta,
          params: m.params,
          createdAt: now,
          updatedAt: now,
          isActive: true,
        },
      })
    }))

    const created = upserts.filter(Boolean)
    return NextResponse.json({
      provider,
      count: created.length,
      models: created,
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error syncing models:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to sync models' }, { status: 500 })
  }
}


