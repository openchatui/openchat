"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChatData } from '@/lib/features/chat'

interface UseTagsResult {
  tags: Record<string, string[]>
}

/**
 * Auto-generates keyword tags for chats using the `/api/v1/tasks/tags` endpoint.
 * For each eligible chat, triggers a background request (once) and updates a local map.
 */
export function useTags(chats: ChatData[], options: { enabled?: boolean } = {}): UseTagsResult {
  const enabled = options.enabled ?? true
  const [tags, setTags] = useState<Record<string, string[]>>({})
  const retryRef = useRef<Record<string, number>>({})

  // Persist dedupe across navigations within the SPA session
  // Module-scoped set avoids re-requesting on page changes
  // Note: kept outside React state/refs to persist across mounts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestedSet = (globalThis as any).__openchat_tags_requested as Set<string> | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalRequested: Set<string> = requestedSet ?? new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(globalThis as any).__openchat_tags_requested) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).__openchat_tags_requested = globalRequested
  }

  const candidates = useMemo(() => {
    if (!enabled) return [] as ChatData[]
    return chats.filter((c) => {
      if (!c || !c.id) return false
      const isNew = (String(c.title || '').trim().toLowerCase() === 'new chat')
      const hasUserMsg = Array.isArray(c.messages) && c.messages.some((m: any) => m?.role === 'user')
      // Skip if tags already exist on the chat meta or we already have them locally
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingMetaTags: unknown = (c as any)?.meta?.tags
      const hasPersistedTags = Array.isArray(existingMetaTags) && (existingMetaTags as unknown[]).length > 0
      const hasLocalTags = Array.isArray(tags[c.id]) && tags[c.id].length > 0
      return isNew && hasUserMsg && !hasPersistedTags && !hasLocalTags
    })
  }, [enabled, chats, tags])

  useEffect(() => {
    if (!enabled) return
    const attempt = (chatId: string) => {
      if (globalRequested.has(chatId)) return
      globalRequested.add(chatId)
      fetch(`/api/v1/tasks/tags`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chatId }),
      })
        .then(async (res) => {
          if (!res.ok) {
            // Retry a few times for transient cases (e.g., messages just saved)
            if (res.status === 400) {
              const count = retryRef.current[chatId] || 0
              if (count < 3) {
                retryRef.current[chatId] = count + 1
                globalRequested.delete(chatId)
                setTimeout(() => attempt(chatId), 1500)
              }
            }
            return
          }
          const data = await res.json().catch(() => null)
          const newTags: string[] | null = (data && Array.isArray(data.tags)) ? data.tags : null
          if (newTags && newTags.length > 0) {
            setTags((prev) => ({ ...prev, [chatId]: newTags }))
          }
        })
        .catch(() => {
          // ignore network errors silently
        })
    }

    candidates.forEach((chat) => attempt(chat.id))
  }, [enabled, candidates])

  return { tags }
}


