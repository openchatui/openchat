'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface DriveSyncAutoProps {
  isConnected: boolean
}

export function DriveSyncAuto({ isConnected }: DriveSyncAutoProps) {
  const [pending, setPending] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!isConnected) return
    if (startedRef.current) return
    startedRef.current = true

    const run = async () => {
      try {
        setPending(true)
        await fetch('/api/drive/sync', { method: 'POST' })
      } catch {
        // ignore
      } finally {
        setPending(false)
      }
    }
    run()
  }, [isConnected])

  if (!isConnected || !pending) return null

  return (
    <div className="flex items-center mr-2 text-xs text-foreground">
      <Loader2 className="h-3 w-3 animate-spin mr-1" />
      <span>Syncing</span>
    </div>
  )
}


