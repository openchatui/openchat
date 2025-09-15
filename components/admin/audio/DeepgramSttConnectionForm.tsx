"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DeepgramSttConnectionForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [savedOk, setSavedOk] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/connections/config", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        const dg = (data?.connections?.deepgram ?? {}) as any
        const existingKey = Array.isArray(dg.api_keys) ? dg.api_keys[0] : undefined
        if (active && typeof existingKey === 'string') {
          setApiKey(existingKey)
          if (existingKey.length > 0) setSavedOk(true)
        }
      } catch {}
      finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const onSave = async (keyToSave: string) => {
    setIsSaving(true)
    try {
      // Load current to preserve other entries
      const currentRes = await fetch("/api/connections/config", { cache: "no-store" })
      const currentData = currentRes.ok ? await currentRes.json() : {}
      const dg = (currentData?.connections?.deepgram ?? {}) as any
      const keys: string[] = Array.isArray(dg.api_keys) ? [...dg.api_keys] : []
      if (keys.length > 0) keys[0] = keyToSave
      else keys.push(keyToSave)

      const payload = { connections: { deepgram: { api_keys: keys, api_configs: { ...((dg && dg.api_configs) || {}) } } } }
      const res = await fetch("/api/connections/config/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save Deepgram key')
      setSavedOk(true)
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-save on input with debounce
  useEffect(() => {
    if (isLoading) return
    setSavedOk(false)
    const handle = setTimeout(() => {
      onSave(apiKey)
    }, 600)
    return () => clearTimeout(handle)
  }, [apiKey, isLoading])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Deepgram API Key</Label>
          <div className="relative">
            <Input
              type="password"
              placeholder="dg_..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              disabled={isLoading}
              className="pr-10"
            />
            {!isSaving && savedOk && apiKey.length > 0 && (
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


