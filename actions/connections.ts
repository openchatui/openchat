"use server"

import { revalidatePath } from "next/cache"
import db from "@/lib/db"
import type { Connection, CreateConnectionData, UpdateConnectionData, ConnectionsConfig } from "@/types/connections"

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
  return rows.map(toConnection)
}

export async function getConnectionsConfig(): Promise<{ connections: ConnectionsConfig }> {
  // Shape config similar to the api route
  const row = await (db as any).config.findUnique({ where: { id: 1 } })
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
      openai: {
        enable: typeof openai.enable === 'boolean' ? openai.enable : defaults.openai.enable,
        api_base_urls: Array.isArray(openai.api_base_urls) ? openai.api_base_urls : defaults.openai.api_base_urls,
        api_keys: Array.isArray(openai.api_keys) ? openai.api_keys : defaults.openai.api_keys,
        api_configs: isPlainObject(openai.api_configs) ? openai.api_configs : defaults.openai.api_configs,
      },
      ollama: {
        enable: typeof ollama.enable === 'boolean' ? ollama.enable : defaults.ollama.enable,
        base_urls: Array.isArray(ollama.base_urls) ? ollama.base_urls : defaults.ollama.base_urls,
        api_configs: isPlainObject(ollama.api_configs) ? ollama.api_configs : defaults.ollama.api_configs,
      },
    },
  }
  // Persist shape if needed
  const needsPersist = !isPlainObject((current as any).connections)
    || !isPlainObject((current as any).connections?.openai)
    || !isPlainObject((current as any).connections?.ollama)
  if (needsPersist) {
    const nextData = { ...current, ...shaped }
    if (row) {
      await (db as any).config.update({ where: { id: 1 }, data: { data: nextData } })
    } else {
      await (db as any).config.create({ data: { id: 1, data: nextData } })
    }
  }
  return shaped as { connections: ConnectionsConfig }
}

export async function createConnections(connections: CreateConnectionData[]): Promise<void> {
  if (!Array.isArray(connections)) return
  await db.connection.createMany({
    data: connections.map((c) => ({
      type: c.type,
      baseUrl: c.baseUrl.trim(),
      apiKey: c.apiKey?.trim() || null,
      provider: null,
    })),
  })
  // Keep config in sync with DB for known providers
  const createdTypes = new Set(connections.map(c => c.type))
  if (createdTypes.has('openai-api')) await syncOpenAIConfigFromDb()
  if (createdTypes.has('ollama')) await syncOllamaConfigFromDb()
  revalidatePath('/admin/connections')
}

export async function updateConnectionAction(id: string, data: UpdateConnectionData): Promise<void> {
  const update: any = {}
  if (typeof data.type !== 'undefined') update.type = data.type
  if (typeof data.baseUrl !== 'undefined') update.baseUrl = String(data.baseUrl).trim()
  if (typeof data.apiKey !== 'undefined') update.apiKey = data.apiKey ? String(data.apiKey).trim() : null
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
  const row = await (db as any).config.findUnique({ where: { id: 1 } })
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
    await (db as any).config.update({ where: { id: 1 }, data: { data: next } })
  } else {
    await (db as any).config.create({ data: { id: 1, data: next } })
  }
  revalidatePath('/admin/connections')
}

export async function testConnectionAction(baseUrl: string): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const endpoint = new URL('/api/connections/test', resolveAppBaseUrl()).toString()
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  const row = await (db as any).config.findUnique({ where: { id: 1 } })
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
  if (row) await (db as any).config.update({ where: { id: 1 }, data: { data: next } })
  else await (db as any).config.create({ data: { id: 1, data: next } })
}

export async function setElevenLabsApiKey(apiKey: string): Promise<void> {
  const row = await (db as any).config.findUnique({ where: { id: 1 } })
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
  if (row) await (db as any).config.update({ where: { id: 1 }, data: { data: next } })
  else await (db as any).config.create({ data: { id: 1, data: next } })
}

export async function setDeepgramApiKey(apiKey: string): Promise<void> {
  const row = await (db as any).config.findUnique({ where: { id: 1 } })
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
  if (row) await (db as any).config.update({ where: { id: 1 }, data: { data: next } })
  else await (db as any).config.create({ data: { id: 1, data: next } })
}

// Sync helpers to ensure config mirrors DB state for connection providers
async function syncOpenAIConfigFromDb(): Promise<void> {
  const [row, rows] = await Promise.all([
    (db as any).config.findUnique({ where: { id: 1 } }),
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

  if (row) await (db as any).config.update({ where: { id: 1 }, data: { data: next } })
  else await (db as any).config.create({ data: { id: 1, data: next } })
}

async function syncOllamaConfigFromDb(): Promise<void> {
  const [row, rows] = await Promise.all([
    (db as any).config.findUnique({ where: { id: 1 } }),
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

  if (row) await (db as any).config.update({ where: { id: 1 }, data: { data: next } })
  else await (db as any).config.create({ data: { id: 1, data: next } })
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


