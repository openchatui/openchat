"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
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
  const attemptsRef = useRef<Record<string, number>>({})
  const pathname = usePathname()

  // Load persisted attempt timestamps to throttle on refresh
  useEffect(() => {
    try {
      const raw = localStorage.getItem('titleAttempts')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          attemptsRef.current = parsed as Record<string, number>
        }
      }
    } catch {}
  }, [])

  const markAttempt = (chatId: string) => {
    attemptsRef.current[chatId] = Date.now()
    try { localStorage.setItem('titleAttempts', JSON.stringify(attemptsRef.current)) } catch {}
  }

  const shouldThrottle = (chatId: string) => {
    const last = attemptsRef.current[chatId] || 0
    return Date.now() - last < 120000 // 2 minutes
  }

  const activeChatId = useMemo(() => {
    const p = String(pathname || '')
    if (!p.startsWith('/c/')) return null
    const id = p.slice(3).split(/[\/#?]/)[0]
    return id || null
  }, [pathname])

  const candidates = useMemo(() => {
    return chats.filter((c) => {
      if (!c || !c.id) return false
      const isNew = (c.title || '').trim().toLowerCase() === 'new chat'
      if (!isNew) return false
      const hasUserMsg = Array.isArray(c.messages) && c.messages.some((m: any) => m?.role === 'user')
      const isActive = activeChatId && c.id === activeChatId
      return Boolean(hasUserMsg || isActive)
    })
  }, [chats, activeChatId])

  useEffect(() => {
    const attempt = (chatId: string, allowRetry: boolean = false) => {
      if (!allowRetry && shouldThrottle(chatId)) return
      if (requestedRef.current.has(chatId)) return
      requestedRef.current.add(chatId)
      if (!allowRetry) markAttempt(chatId)
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
                setTimeout(() => attempt(chatId, true), 1500)
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
            markAttempt(chatId)
          }
        })
        .catch(() => {
          // ignore
        })
    }

    candidates.forEach((chat) => attempt(chat.id, false))
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


