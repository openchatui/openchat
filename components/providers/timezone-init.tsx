"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function TimezoneInitializer() {
  const router = useRouter()

  useEffect(() => {
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!browserTz || typeof document === 'undefined') return

      const cookieMatch = document.cookie.match(/(?:^|; )tz=([^;]+)/)
      const currentTz = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null
      if (currentTz !== browserTz) {
        // Persist for 1 year
        const maxAge = 60 * 60 * 24 * 365
        document.cookie = `tz=${encodeURIComponent(browserTz)}; path=/; max-age=${maxAge}`
        // Refresh to allow server components to use the timezone
        router.refresh()
      }
    } catch {
      // no-op
    }
  }, [router])

  return null
}


