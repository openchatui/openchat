"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { updateConnectionsConfig } from "@/lib/api/connections"

interface OpenAISttConnectionFormProps {
  initialBaseUrl?: string
  initialApiKey?: string
}

export function OpenAISttConnectionForm({ initialBaseUrl = "", initialApiKey = "" }: OpenAISttConnectionFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl)
  const [apiKey, setApiKey] = useState(initialApiKey)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  const onSave = async () => {
    setIsSaving(true)
    try {
      await updateConnectionsConfig({
        connections: {
          openai: {
            api_base_urls: [String(baseUrl)],
            api_keys: [String(apiKey)],
            api_configs: { "0": { enable: true } },
          }
        }
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Base URL</Label>
          <Input
            placeholder="https://api.openai.com/v1"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label>API Key</Label>
          <Input
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>
      <div>
        <Button onClick={onSave} disabled={isSaving || isLoading}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}


