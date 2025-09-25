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
      return isNew
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
            try {
              const bc = new BroadcastChannel('chats')
              bc.postMessage({ type: 'title-updated', id: chatId, title: newTitle })
              bc.close()
            } catch {}
          }
        })
        .catch(() => {
          // ignore
        })
    }

    candidates.forEach((chat) => attempt(chat.id))
  }, [candidates])

  // Listen for title updates from other tabs or subsystems
  useEffect(() => {
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('chats')
      bc.onmessage = (ev: MessageEvent) => {
        const data = ev.data || {}
        if (data?.type === 'title-updated' && typeof data?.id === 'string' && typeof data?.title === 'string') {
          setTitles((prev) => ({ ...prev, [data.id]: data.title }))
        }
      }
    } catch {}
    return () => { try { bc && bc.close() } catch {} }
  }, [])

  return { titles }
}


