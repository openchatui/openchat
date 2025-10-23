"use server"

import { revalidatePath } from "next/cache"
import { cookies } from 'next/headers'
import db from "@/lib/db"
import type { Connection, CreateConnectionData, UpdateConnectionData, ConnectionsConfig } from "@/lib/modules/connections/connections.types"

function toConnection(o: any): Connection {
  return {
    id: o.id,
    type: o.type as any,
    baseUrl: o.baseUrl,
    apiKey: o.apiKey ?? undefined,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
  }
}

export async function getConnections(): Promise<Connection[]> {
  const rows = await db.connection.findMany({ orderBy: { createdAt: 'desc' } })
  // Backfill provider field if missing or incorrect
  const updates: Array<Promise<any>> = []
  for (const row of rows) {
    const inferred = inferProviderFromBaseUrl((row as any).baseUrl, (row as any).type)
    if ((row as any).provider !== inferred) {
      updates.push(db.connection.update({ where: { id: (row as any).id }, data: { provider: inferred } }))
    }
  }
  if (updates.length > 0) {
    await Promise.allSettled(updates)
  }
  return rows.map(toConnection)
}
// Infer canonical provider from baseUrl (and optionally type)
function inferProviderFromBaseUrl(baseUrl: string | null | undefined, type?: string | null): string | null {
  if (!baseUrl || String(baseUrl).trim() === '') return null
  const raw = String(baseUrl).trim().toLowerCase()
  let host = ''
  let port = ''
  try {
    const u = new URL(raw)
    host = u.hostname.toLowerCase()
    port = u.port
  } catch {
    // Fallback simple parsing for non-URL strings
    const m = raw.match(/^https?:\/\/([^\/]+)(?:\/.+)?$/)
    const hostPort = m ? m[1] : raw
    const hp = hostPort.split(':')
    host = hp[0]
    port = hp[1] || ''
  }

  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('10.') || host.startsWith('192.168.') || host.endsWith('.local')
  if (isLocal && (port === '11434' || /:11434(?:\/?$)/.test(raw))) return 'ollama'

  if (raw.includes('openrouter')) return 'openrouter'
  if (raw.includes('openai.com') || raw.includes('openai')) return 'openai'

  // Fallbacks by type
  if (type === 'ollama') return 'ollama'
  if (type === 'openai-api') return 'openai'

  return null
}


export async function getConnectionsConfig(): Promise<{ connections: ConnectionsConfig }> {
  // Shape config similar to the api route
  const row = await db.config.findUnique({ where: { id: 1 } })
  const current = (row?.data || {}) as any
  function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
  const defaults = {
    openai: { enable: false, api_base_urls: [] as string[], api_keys: [] as string[], api_configs: {} as Record<string, unknown> },
    ollama: { enable: false, base_urls: [] as string[], api_configs: {} as Record<string, unknown> },
  }
  const connections = isPlainObject(current.connections) ? (current.connections as any) : {}
  const openai = isPlainObject(connections.openai) ? connections.openai as any : {}
  const ollama = isPlainObject(connections.ollama) ? connections.ollama as any : {}
  const shaped = {
    connections: {
      providers: {
        openai: {
          enabled: typeof openai.enable === 'boolean' ? openai.enable : defaults.openai.enable,
          baseUrl: Array.isArray(openai.api_base_urls) ? openai.api_base_urls[0] : undefined,
          apiKey: Array.isArray(openai.api_keys) ? openai.api_keys[0] : undefined,
          settings: {
            api_base_urls: Array.isArray(openai.api_base_urls) ? openai.api_base_urls : defaults.openai.api_base_urls,
            api_keys: Array.isArray(openai.api_keys) ? openai.api_keys : defaults.openai.api_keys,
            api_configs: isPlainObject(openai.api_configs) ? openai.api_configs : defaults.openai.api_configs,
          }
        },
        ollama: {
          enabled: typeof ollama.enable === 'boolean' ? ollama.enable : defaults.ollama.enable,
          baseUrl: Array.isArray(ollama.base_urls) ? ollama.base_urls[0] : undefined,
          settings: {
            base_urls: Array.isArray(ollama.base_urls) ? ollama.base_urls : defaults.ollama.base_urls,
            api_configs: isPlainObject(ollama.api_configs) ? ollama.api_configs : defaults.ollama.api_configs,
          }
        }
      }
    }
  }
  // Persist shape if needed
  const needsPersist = !isPlainObject((current as any).connections)
    || !isPlainObject((current as any).connections?.openai)
    || !isPlainObject((current as any).connections?.ollama)
  if (needsPersist) {
    const nextData = { ...current, ...shaped }
    if (row) {
      await db.config.update({ where: { id: 1 }, data: { data: nextData } })
    } else {
      await db.config.create({ data: { id: 1, data: nextData } })
    }
  }
  return shaped
}

export async function createConnections(connections: CreateConnectionData[]): Promise<void> {
  if (!Array.isArray(connections) || connections.length === 0) return
  // Insert sequentially to avoid createMany edge-cases and ensure all rows are persisted
  for (const c of connections) {
    const provider = inferProviderFromBaseUrl(c.baseUrl, c.type)
    await db.connection.create({
      data: {
        type: c.type,
        baseUrl: c.baseUrl.trim(),
        apiKey: c.apiKey?.trim() || null,
        provider: provider,
      },
    })
  }
  // Keep config in sync with DB for known providers
  const createdTypes = new Set(connections.map(c => c.type))
  if (createdTypes.has('openai-api')) await syncOpenAIConfigFromDb()
  if (createdTypes.has('ollama')) await syncOllamaConfigFromDb()
  revalidatePath('/admin/connections')
}

export async function updateConnectionAction(id: string, data: UpdateConnectionData): Promise<void> {
  const current = await db.connection.findUnique({ where: { id } })
  if (!current) return

  const nextType = typeof data.type !== 'undefined' ? data.type : (current.type as any)
  const nextBaseUrl = typeof data.baseUrl !== 'undefined' ? String(data.baseUrl).trim() : String(current.baseUrl)
  const provider = inferProviderFromBaseUrl(nextBaseUrl, nextType)

  const update: any = {}
  if (typeof data.type !== 'undefined') update.type = data.type
  if (typeof data.baseUrl !== 'undefined') update.baseUrl = nextBaseUrl
  if (typeof data.apiKey !== 'undefined') update.apiKey = data.apiKey ? String(data.apiKey).trim() : null
  update.provider = provider

  await db.connection.update({ where: { id }, data: update })
  // Keep config aligned with current DB
  await Promise.all([syncOpenAIConfigFromDb(), syncOllamaConfigFromDb()])
  revalidatePath('/admin/connections')
}

export async function deleteConnectionAction(id: string): Promise<void> {
  await db.connection.delete({ where: { id } })
  // Keep config aligned after deletion
  await Promise.all([syncOpenAIConfigFromDb(), syncOllamaConfigFromDb()])
  revalidatePath('/admin/connections')
}

export async function updateConnectionsConfig(payload: any): Promise<void> {
  const row = await db.config.findUnique({ where: { id: 1 } })
  const current = (row?.data || {}) as any

  // Deep merge helper to avoid clobbering sibling keys on nested updates
  const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  const deepMerge = (target: any, source: any): any => {
    if (!isPlainObject(target) || !isPlainObject(source)) return source
    const result: Record<string, any> = { ...target }
    for (const key of Object.keys(source)) {
      const srcVal = (source as any)[key]
      const tgtVal = (target as any)[key]
      if (isPlainObject(srcVal) && isPlainObject(tgtVal)) {
        result[key] = deepMerge(tgtVal, srcVal)
      } else {
        result[key] = srcVal
      }
    }
    return result
  }

  const next = deepMerge(current, payload || {})
  if (row) {
    await db.config.update({ where: { id: 1 }, data: { data: next } })
  } else {
    await db.config.create({ data: { id: 1, data: next } })
  }
  revalidatePath('/admin/connections')
}

export async function testConnectionAction(baseUrl: string): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const endpoint = new URL('/api/v1/connections/test', resolveAppBaseUrl()).toString()
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ')
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      body: JSON.stringify({ baseUrl }),
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    return { success: res.ok && Boolean((data as any).success), status: (data as any).status ?? res.status, error: (data as any).error }
  } catch (e: any) {
    return { success: false, error: e?.message }
  }
}

export async function syncModelsAction(input: { baseUrl: string; type: 'openai-api' | 'ollama'; apiKey?: string }): Promise<{ count: number } | null> {
  try {
    const endpoint = new URL('/api/v1/models/sync', resolveAppBaseUrl()).toString()
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ')
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookieHeader ? { Cookie: cookieHeader } : {}) },
      body: JSON.stringify({ baseUrl: input.baseUrl.trim(), type: input.type, apiKey: input.apiKey || null, ollama: input.type === 'ollama' ? 'ollama' : undefined }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}


// Audio-related connection helpers
export async function setOpenAISttCredentials(baseUrl: string, apiKey: string): Promise<void> {
  const row = await db.config.findUnique({ where: { id: 1 } })
  const current = (row?.data || {}) as any
  const connections = (current?.connections && typeof current.connections === 'object') ? current.connections as any : {}
  const openai = (connections.openai && typeof connections.openai === 'object') ? connections.openai as any : {}
  const urls: string[] = Array.isArray(openai.api_base_urls) ? [...openai.api_base_urls] : []
  const keys: string[] = Array.isArray(openai.api_keys) ? [...openai.api_keys] : []
  const api_configs: Record<string, any> = (openai.api_configs && typeof openai.api_configs === 'object') ? { ...openai.api_configs } : {}

  let idx = urls.findIndex((u) => typeof u === 'string' && u.toLowerCase().includes('openai.com'))
  if (idx < 0) idx = urls.findIndex((u) => typeof u === 'string' && /openai/.test(String(u)))
  if (idx >= 0) {
    urls[idx] = String(baseUrl)
    keys[idx] = String(apiKey)
    api_configs[String(idx)] = { ...(api_configs[String(idx)] || {}), enable: true }
  } else {
    urls.push(String(baseUrl))
    keys.push(String(apiKey))
    const newIdx = urls.length - 1
    api_configs[String(newIdx)] = { ...(api_configs[String(newIdx)] || {}), enable: true }
  }

  const next = {
    ...current,
    connections: {
      ...connections,
      openai: {
        ...openai,
        api_base_urls: urls,
        api_keys: keys,
        api_configs,
      }
    }
  }
  if (row) await db.config.update({ where: { id: 1 }, data: { data: next } })
  else await db.config.create({ data: { id: 1, data: next } })
}

export async function setElevenLabsApiKey(apiKey: string): Promise<void> {
  const row = await db.config.findUnique({ where: { id: 1 } })
  const current = (row?.data || {}) as any
  const connections = (current?.connections && typeof current.connections === 'object') ? current.connections as any : {}
  const el = (connections.elevenlabs && typeof connections.elevenlabs === 'object') ? connections.elevenlabs as any : {}
  const keys: string[] = Array.isArray(el.api_keys) ? [...el.api_keys] : []
  if (keys.length > 0) keys[0] = String(apiKey)
  else keys.push(String(apiKey))

  const next = {
    ...current,
    connections: {
      ...connections,
      elevenlabs: {
        ...el,
        api_keys: keys,
        api_configs: { ...(el.api_configs || {}) }
      }
    }
  }
  if (row) await db.config.update({ where: { id: 1 }, data: { data: next } })
  else await db.config.create({ data: { id: 1, data: next } })
}

export async function setDeepgramApiKey(apiKey: string): Promise<void> {
  const row = await db.config.findUnique({ where: { id: 1 } })
  const current = (row?.data || {}) as any
  const connections = (current?.connections && typeof current.connections === 'object') ? current.connections as any : {}
  const dg = (connections.deepgram && typeof connections.deepgram === 'object') ? connections.deepgram as any : {}
  const keys: string[] = Array.isArray(dg.api_keys) ? [...dg.api_keys] : []
  if (keys.length > 0) keys[0] = String(apiKey)
  else keys.push(String(apiKey))

  const next = {
    ...current,
    connections: {
      ...connections,
      deepgram: {
        ...dg,
        api_keys: keys,
        api_configs: { ...(dg.api_configs || {}) }
      }
    }
  }
  if (row) await db.config.update({ where: { id: 1 }, data: { data: next } })
  else await db.config.create({ data: { id: 1, data: next } })
}

// Sync helpers to ensure config mirrors DB state for connection providers
async function syncOpenAIConfigFromDb(): Promise<void> {
  const [row, rows] = await Promise.all([
    db.config.findUnique({ where: { id: 1 } }),
    db.connection.findMany({ where: { type: 'openai-api' }, orderBy: { createdAt: 'desc' } }),
  ])
  const current = (row?.data || {}) as any
  const connections = (current?.connections && typeof current.connections === 'object') ? current.connections as any : {}
  const openai = (connections.openai && typeof connections.openai === 'object') ? connections.openai as any : {}
  const prevConfigs: Record<string, any> = (openai.api_configs && typeof openai.api_configs === 'object') ? { ...openai.api_configs } : {}

  const urls: string[] = rows.map(r => String(r.baseUrl))
  const keys: (string | null)[] = rows.map(r => (r.apiKey ? String(r.apiKey) : null))

  const api_configs: Record<string, any> = {}
  for (let i = 0; i < urls.length; i++) {
    api_configs[String(i)] = { ...(prevConfigs[String(i)] || {}) }
  }

  const next = {
    ...current,
    connections: {
      ...connections,
      openai: {
        ...openai,
        api_base_urls: urls,
        api_keys: keys.map(k => k ?? ''),
        api_configs,
      },
    },
  }

  if (row) await db.config.update({ where: { id: 1 }, data: { data: next } })
  else await db.config.create({ data: { id: 1, data: next } })
}

async function syncOllamaConfigFromDb(): Promise<void> {
  const [row, rows] = await Promise.all([
    db.config.findUnique({ where: { id: 1 } }),
    db.connection.findMany({ where: { type: 'ollama' }, orderBy: { createdAt: 'desc' } }),
  ])
  const current = (row?.data || {}) as any
  const connections = (current?.connections && typeof current.connections === 'object') ? current.connections as any : {}
  const ollama = (connections.ollama && typeof connections.ollama === 'object') ? connections.ollama as any : {}

  const base_urls: string[] = rows.map(r => String(r.baseUrl))

  const next = {
    ...current,
    connections: {
      ...connections,
      ollama: {
        ...ollama,
        base_urls,
      },
    },
  }

  if (row) await db.config.update({ where: { id: 1 }, data: { data: next } })
  else await db.config.create({ data: { id: 1, data: next } })
}

export async function syncConnectionsConfigFromDb(): Promise<void> {
  await Promise.all([syncOpenAIConfigFromDb(), syncOllamaConfigFromDb()])
}

function resolveAppBaseUrl(): string {
  const envCandidate = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || process.env.VERCEL_URL
  if (envCandidate) {
    const normalized = envCandidate.replace(/\/$/, '')
    if (/^https?:\/\//i.test(normalized)) return normalized
    return `https://${normalized}`
  }
  const port = process.env.PORT || '3000'
  return `http://localhost:${port}`
}


