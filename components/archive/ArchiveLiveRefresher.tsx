"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ArchiveLiveRefresher() {
  const router = useRouter()

  useEffect(() => {
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('chats')
      const handler = (event: MessageEvent) => {
        const data = event?.data
        if (data && (data.type === 'archived' || data.type === 'deleted' || data.type === 'updated')) {
          router.refresh()
        }
      }
      bc.addEventListener('message', handler)
      return () => {
        try { bc && bc.removeEventListener('message', handler) } catch {}
        try { bc && bc.close() } catch {}
      }
    } catch {
      // Fallback: no BroadcastChannel support
      return () => {}
    }
  }, [router])

  return null
}


