import 'server-only'

import db from '@/lib/db'
import type { AppUIMessage, ChatData } from '@/lib/features/chat/chat.types'
import type { Model } from '@/lib/features/models/model.types'
import { getUserRole } from '@/lib/server/access-control/permissions.service'

export interface SearchOptions {
  query: string
  mentions?: string[]
}

type SearchField = 'title' | 'chat' | 'tags'

function normalize(str: string): string {
  return str.toLowerCase()
}

function extractTextFromMessages(messages: AppUIMessage[]): string {
  try {
    return messages
      .map((m) =>
        (m.parts || [])
          .filter((p: any) => p?.type === 'text')
          .map((p: any) => String(p.text || ''))
          .join(' ')
      )
      .join(' ')
  } catch {
    return ''
  }
}

function readTags(meta: unknown): string[] {
  try {
    const m = (meta || {}) as any
    const t = m?.tags || m?.chatTags || []
    if (Array.isArray(t)) return t.filter((x) => typeof x === 'string') as string[]
    return []
  } catch {
    return []
  }
}

function pickFields(mentions?: string[]): SearchField[] {
  // Special rule: when @tags is present and neither @chats nor @archived is restricting scope,
  // we limit fields to only 'tags'. Otherwise we search all fields.
  if (Array.isArray(mentions) && mentions.includes('tags')) {
    return ['tags']
  }
  return ['title', 'chat', 'tags']
}

function matchesChat(
  chat: ChatData & { meta?: unknown },
  q: string,
  fields: SearchField[]
): boolean {
  const needle = normalize(q)
  if (!needle) return false

  if (fields.includes('title')) {
    const title = String(chat.title || '')
    if (normalize(title).includes(needle)) return true
  }

  if (fields.includes('chat')) {
    const text = extractTextFromMessages(chat.messages || [])
    if (normalize(text).includes(needle)) return true
  }

  if (fields.includes('tags')) {
    const tags = Array.isArray(chat.tags) && chat.tags.length > 0 ? chat.tags : readTags((chat as any).meta)
    if (tags.some((t) => normalize(String(t)).includes(needle))) return true
  }

  return false
}

async function fetchUserChatsBase(userId: string, archived: boolean) {
  const rows = await db.chat.findMany({
    where: { userId, archived: archived ? { not: 0 } : (0 as any) },
    select: {
      id: true,
      userId: true,
      title: true,
      chat: true,
      createdAt: true,
      updatedAt: true,
      archived: true,
      meta: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  const items: (ChatData & { meta?: unknown })[] = rows.map((row) => {
    const raw = row.chat as unknown
    const messages = Array.isArray(raw)
      ? (raw.filter((m: any) => typeof m === 'object' && m && Array.isArray(m.parts)) as AppUIMessage[])
      : []
    const tags = readTags((row as any).meta)
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      messages,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      archived: row.archived !== 0,
      tags,
      modelId: null,
      meta: (row as any).meta,
    }
  })

  return items
}

export async function searchUserChats(userId: string, options: SearchOptions): Promise<ChatData[]> {
  const q = String(options.query || '').trim()
  if (!q) return []
  const fields = pickFields(options.mentions)
  const items = await fetchUserChatsBase(userId, false)
  return items.filter((c) => matchesChat(c, q, fields))
}

export async function searchUserArchivedChats(userId: string, options: SearchOptions): Promise<ChatData[]> {
  const q = String(options.query || '').trim()
  if (!q) return []
  const fields = pickFields(options.mentions)
  const items = await fetchUserChatsBase(userId, true)
  return items.filter((c) => matchesChat(c, q, fields))
}

export async function searchUserModels(userId: string, options: SearchOptions): Promise<Model[]> {
  const q = String(options.query || '').trim()
  if (!q) return []
  const role = await getUserRole(userId)
  const isAdmin = role === 'ADMIN' || role === 'admin'
  const rows = await (db as any).model.findMany({
    where: {
      ...(isAdmin ? {} : { userId }),
    },
    select: {
      id: true,
      userId: true,
      providerId: true,
      provider: true,
      baseModelId: true,
      name: true,
      meta: true,
      params: true,
      createdAt: true,
      updatedAt: true,
      isActive: true,
      accessControl: true,
    },
    orderBy: { updatedAt: 'desc' as any },
    take: 500,
  })

  const needle = q.toLowerCase()
  const filtered = rows.filter((r: any) => {
    const name = String(r?.name || '').toLowerCase()
    const provider = String(r?.provider || '').toLowerCase()
    return name.includes(needle) || provider.includes(needle)
  })

  const items: Model[] = filtered.map((r: any) => ({
    id: r.id,
    userId: r.userId,
    providerId: r.providerId,
    provider: r.provider,
    baseModelId: r.baseModelId,
    name: r.name,
    meta: (r.meta || {}) as any,
    params: r.params,
    createdAt: Number(r.createdAt) as any,
    updatedAt: Number(r.updatedAt) as any,
    isActive: Boolean(r.isActive),
    accessControl: r.accessControl,
  }))
  return items
}


