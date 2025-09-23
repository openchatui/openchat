"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChatData } from '@/lib/features/chat'

interface UseChatTitlesResult {
  titles: Record<string, string>
}

/**
 * Auto-generates clean titles for chats currently titled "New Chat".
 * Triggers a one-time background request per chat and updates local titles map.
 */
export function useChatTitles(chats: ChatData[]): UseChatTitlesResult {
  const [titles, setTitles] = useState<Record<string, string>>({})
  const requestedRef = useRef<Set<string>>(new Set())
  const retryRef = useRef<Record<string, number>>({})

  const candidates = useMemo(() => {
    return chats.filter((c) => {
      if (!c || !c.id) return false
      const isNew = (c.title || '').trim().toLowerCase() === 'new chat'
      const hasUserMsg = Array.isArray(c.messages) && c.messages.some((m: any) => m?.role === 'user')
      return isNew && hasUserMsg
    })
  }, [chats])

  useEffect(() => {
    const attempt = (chatId: string) => {
      if (requestedRef.current.has(chatId)) return
      requestedRef.current.add(chatId)
      fetch(`/api/v1/tasks/title`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chatId }),
      })
        .then(async (res) => {
          if (!res.ok) {
            // Retry a few times for cases where the first user message just arrived
            if (res.status === 400) {
              const count = retryRef.current[chatId] || 0
              if (count < 3) {
                retryRef.current[chatId] = count + 1
                requestedRef.current.delete(chatId)
                setTimeout(() => attempt(chatId), 1500)
              }
            }
            return
          }
          const data = await res.json().catch(() => null)
          const newTitle = (data && typeof data.title === 'string') ? data.title : null
          if (newTitle) {
            setTitles((prev) => ({ ...prev, [chatId]: newTitle }))
          }
        })
        .catch(() => {
          // ignore
        })
    }

    candidates.forEach((chat) => attempt(chat.id))
  }, [candidates])

  return { titles }
}


