"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function TimezoneInitializer() {
  const router = useRouter()

  useEffect(() => {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') return
      // Only handle once per tab to avoid repeated actions during dev Fast Refresh
      if (sessionStorage.getItem('tz_init_done') === '1') return

      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!browserTz) return

      const cookieMatch = document.cookie.match(/(?:^|; )tz=([^;]+)/)
      const currentTz = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null
      if (currentTz !== browserTz) {
        const maxAge = 60 * 60 * 24 * 365
        document.cookie = `tz=${encodeURIComponent(browserTz)}; path=/; max-age=${maxAge}`
      }
      // Mark handled but do not force a refresh; server will pick it up on next navigation
      sessionStorage.setItem('tz_init_done', '1')
    } catch {
      // no-op
    }
  }, [router])

  return null
}


