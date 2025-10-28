import 'server-only'
import db from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function listConnections() {
  return await db.connection.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function getConnectionById(id: string) {
  return await db.connection.findUnique({ where: { id } })
}

export async function createConnection(data: { type: string; baseUrl: string; apiKey?: string | null; provider?: string }) {
  return await db.connection.create({
    data: { type: data.type as any, baseUrl: data.baseUrl, apiKey: data.apiKey ?? null, provider: data.provider },
  })
}

export async function updateConnection(id: string, data: Partial<{ type: string; baseUrl: string; apiKey: string | null; provider: string }>) {
  return await db.connection.update({
    where: { id },
    data: {
      ...(data.type ? { type: data.type as any } : {}),
      ...(data.baseUrl ? { baseUrl: data.baseUrl } : {}),
      ...(data.apiKey !== undefined ? { apiKey: data.apiKey } : {}),
      ...(data.provider ? { provider: data.provider } : {}),
    },
  })
}

export async function deleteConnection(id: string) {
  await db.connection.delete({ where: { id } })
}

export async function listConnectionsByType(type: string) {
  return await db.connection.findMany({ where: { type: type as any }, orderBy: { createdAt: 'desc' } })
}

export async function listConnectionsByProvider(provider: string) {
  return await db.connection.findMany({ where: { provider }, orderBy: { createdAt: 'desc' } })
}

export async function getProviderConnection(provider: string) {
  return await db.connection.findFirst({ where: { provider }, select: { baseUrl: true, apiKey: true } })
}



function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ensureConnectionsConfigShape(data: unknown): { connections: Record<string, unknown> } {
  const defaults = {
    openai: { enable: false, api_base_urls: [] as string[], api_keys: [] as string[], api_configs: {} as Record<string, unknown> },
    ollama: { enable: false, base_urls: [] as string[], api_configs: {} as Record<string, unknown> },
    deepgram: { enable: false, api_keys: [] as string[], api_configs: {} as Record<string, unknown> },
    elevenlabs: { enable: false, api_keys: [] as string[], api_configs: {} as Record<string, unknown> },
  }

  const root = isPlainObject(data) ? (data as Record<string, unknown>) : {}
  const connections = isPlainObject(root.connections) ? (root.connections as Record<string, unknown>) : {}

  const openai = isPlainObject(connections.openai) ? (connections.openai as Record<string, unknown>) : {}
  const ollama = isPlainObject(connections.ollama) ? (connections.ollama as Record<string, unknown>) : {}
  const deepgram = isPlainObject(connections.deepgram) ? (connections.deepgram as Record<string, unknown>) : {}
  const elevenlabs = isPlainObject(connections.elevenlabs) ? (connections.elevenlabs as Record<string, unknown>) : {}

  return {
    connections: {
      openai: {
        enable: typeof (openai as any).enable === 'boolean' ? (openai as any).enable : defaults.openai.enable,
        api_base_urls: Array.isArray((openai as any).api_base_urls) ? (openai as any).api_base_urls : defaults.openai.api_base_urls,
        api_keys: Array.isArray((openai as any).api_keys) ? (openai as any).api_keys : defaults.openai.api_keys,
        api_configs: isPlainObject((openai as any).api_configs) ? (openai as any).api_configs : defaults.openai.api_configs,
      },
      ollama: {
        enable: typeof (ollama as any).enable === 'boolean' ? (ollama as any).enable : defaults.ollama.enable,
        base_urls: Array.isArray((ollama as any).base_urls) ? (ollama as any).base_urls : defaults.ollama.base_urls,
        api_configs: isPlainObject((ollama as any).api_configs) ? (ollama as any).api_configs : defaults.ollama.api_configs,
      },
      deepgram: {
        enable: typeof (deepgram as any).enable === 'boolean' ? (deepgram as any).enable : defaults.deepgram.enable,
        api_keys: Array.isArray((deepgram as any).api_keys) ? (deepgram as any).api_keys : defaults.deepgram.api_keys,
        api_configs: isPlainObject((deepgram as any).api_configs) ? (deepgram as any).api_configs : defaults.deepgram.api_configs,
      },
      elevenlabs: {
        enable: typeof (elevenlabs as any).enable === 'boolean' ? (elevenlabs as any).enable : defaults.elevenlabs.enable,
        api_keys: Array.isArray((elevenlabs as any).api_keys) ? (elevenlabs as any).api_keys : defaults.elevenlabs.api_keys,
        api_configs: isPlainObject((elevenlabs as any).api_configs) ? (elevenlabs as any).api_configs : defaults.elevenlabs.api_configs,
      },
    } as Record<string, unknown>,
  }
}

export async function getConnectionsConfig(): Promise<{ connections: Record<string, unknown> }> {
  const row = await db.config.findUnique({ where: { id: 1 } })
  if (!row) {
    const shaped = ensureConnectionsConfigShape({})
    await db.config.create({ data: { id: 1, data: shaped as unknown as Prisma.InputJsonValue } })
    return shaped
  }

  const current = row.data as unknown
  const shaped = ensureConnectionsConfigShape(current)

  const needsPersist = !isPlainObject((current as any))
    || !isPlainObject((current as any).connections)
    || !isPlainObject((current as any).connections?.openai)
    || !isPlainObject((current as any).connections?.ollama)
    || !isPlainObject((current as any).connections?.deepgram)

  if (needsPersist) {
    const currentObj: Record<string, unknown> = isPlainObject(current) ? (current as Record<string, unknown>) : {}
    const nextData = { ...currentObj, ...shaped } as unknown as Prisma.InputJsonValue
    await db.config.update({ where: { id: 1 }, data: { data: nextData } })
  }

  return shaped
}

