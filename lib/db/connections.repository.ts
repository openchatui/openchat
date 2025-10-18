import 'server-only'
import db from '@/lib/db/client'

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


