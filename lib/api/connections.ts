import { absoluteUrl, httpFetch } from './http'
import type { Connection, ConnectionsConfig } from '@/types/connections.types'

export async function getConnections(): Promise<Connection[]> {
  const res = await httpFetch(absoluteUrl('/api/v1/connections'), { method: 'GET' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new Error((data as any)?.error || 'Failed to fetch connections')
  }
  const data = await res.json()
  return data as Connection[]
}

export async function getConnectionsConfig(): Promise<{ connections: ConnectionsConfig }> {
  const res = await httpFetch(absoluteUrl('/api/v1/connections/config'), { method: 'GET' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new Error((data as any)?.error || 'Failed to fetch connections config')
  }
  const data = await res.json()
  return data as { connections: ConnectionsConfig }
}

// Create one or more connections
export async function createConnections(payload: Array<{ type: string; baseUrl: string; apiKey?: string }>): Promise<void> {
  if (!Array.isArray(payload) || payload.length === 0) return
  const res = await httpFetch(absoluteUrl('/api/v1/connections'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload.length === 1 ? payload[0] : payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error || 'Failed to create connections')
  }
}

// Update a connection by id
export async function updateConnection(id: string, data: { type?: string; baseUrl?: string; apiKey?: string }): Promise<void> {
  const res = await httpFetch(absoluteUrl(`/api/v1/connections/${encodeURIComponent(id)}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error((payload as any)?.error || 'Failed to update connection')
  }
}

// Delete a connection by id
export async function deleteConnection(id: string): Promise<void> {
  const res = await httpFetch(absoluteUrl(`/api/v1/connections/${encodeURIComponent(id)}`), { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error || 'Failed to delete connection')
  }
}

// Update the connections config (partial upsert)
export async function updateConnectionsConfig(payload: any): Promise<void> {
  const res = await httpFetch(absoluteUrl('/api/v1/connections/config/update'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error || 'Failed to update connections config')
  }
}

// Sync models from a provider
export async function syncModels(input: { baseUrl: string; type: 'openai-api' | 'ollama'; apiKey?: string }): Promise<{ count: number } | null> {
  const res = await httpFetch(absoluteUrl('/api/v1/models/sync'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseUrl: input.baseUrl, type: input.type, apiKey: input.apiKey ?? null, ollama: input.type === 'ollama' ? 'ollama' : undefined }),
  })
  if (!res.ok) return null
  return await res.json().catch(() => null)
}

