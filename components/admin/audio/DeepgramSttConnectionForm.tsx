"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateConnectionsConfig } from "@/lib/api/connections"

interface DeepgramSttConnectionFormProps {
  initialApiKey?: string
}

export function DeepgramSttConnectionForm({ initialApiKey = "" }: DeepgramSttConnectionFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [apiKey, setApiKey] = useState(initialApiKey)
  const [savedOk, setSavedOk] = useState(false)

  useEffect(() => {
    setSavedOk(Boolean(initialApiKey))
    setIsLoading(false)
  }, [initialApiKey])

  const onSave = async (keyToSave: string) => {
    setIsSaving(true)
    try {
      await updateConnectionsConfig({ connections: { deepgram: { api_keys: [String(keyToSave)] } } })
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


