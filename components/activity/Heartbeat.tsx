'use client'

import { useEffect, useRef } from 'react'

function getOrCreateTabId(): string {
  try {
    const KEY = 'oc_tab_id'
    let id = sessionStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(KEY, id)
    }
    return id
  } catch {
    // Fallback: random string
    return Math.random().toString(36).slice(2)
  }
}

export interface HeartbeatProps {
  intervalMs?: number
}

export default function Heartbeat({ intervalMs = 15000 }: HeartbeatProps) {
  const timerRef = useRef<number | null>(null)
  const tabIdRef = useRef<string>('')

  useEffect(() => {
    tabIdRef.current = getOrCreateTabId()

    const send = async () => {
      try {
        // Avoid sending heartbeats on setup/auth pages
        const pathNow = location.pathname
        if (pathNow.startsWith('/setup') || pathNow.startsWith('/login') || pathNow.startsWith('/signup')) {
          return
        }
        await fetch('/api/v1/activity/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tabId: tabIdRef.current,
            path: pathNow,
            userAgent: navigator.userAgent,
          }),
          keepalive: true,
        })
      } catch {
        // ignore
      }
    }

    const start = () => {
      if (timerRef.current) return
      // fire immediately then interval
      void send()
      timerRef.current = window.setInterval(send, intervalMs) as unknown as number
    }
    const stop = () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }
    const onBeforeUnload = () => {
      stop()
      // one last best-effort ping
      void fetch('/api/v1/activity/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabId: tabIdRef.current, path: location.pathname, userAgent: navigator.userAgent }),
        keepalive: true,
      })
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    start()

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
      stop()
    }
  }, [intervalMs])

  return null
}


