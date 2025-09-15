"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export function OpenAISttConnectionForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/connections/config", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        const openai = (data?.connections?.openai ?? {}) as any
        const urls: string[] = Array.isArray(openai.api_base_urls) ? openai.api_base_urls : []
        const keys: string[] = Array.isArray(openai.api_keys) ? openai.api_keys : []
        let idx = urls.findIndex(u => typeof u === 'string' && u.toLowerCase().includes('openai.com'))
        if (idx < 0) idx = urls.findIndex(u => typeof u === 'string' && /openai/.test(u))
        const existingBase = idx >= 0 ? urls[idx] : undefined
        const existingKey = idx >= 0 ? keys[idx] : undefined
        if (active) {
          if (typeof existingBase === "string") setBaseUrl(existingBase)
          if (typeof existingKey === "string") setApiKey(existingKey)
        }
      } catch (err) {
        // noop
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const onSave = async () => {
    setIsSaving(true)
    try {
      // Load current config to avoid overwriting other entries
      const currentRes = await fetch("/api/connections/config", { cache: "no-store" })
      const currentData = currentRes.ok ? await currentRes.json() : {}
      const openai = (currentData?.connections?.openai ?? {}) as any
      const urls: string[] = Array.isArray(openai.api_base_urls) ? [...openai.api_base_urls] : []
      const keys: string[] = Array.isArray(openai.api_keys) ? [...openai.api_keys] : []
      const api_configs: Record<string, any> = typeof openai.api_configs === 'object' && openai.api_configs !== null
        ? { ...openai.api_configs }
        : {}

      let idx = urls.findIndex(u => typeof u === 'string' && u.toLowerCase().includes('openai.com'))
      if (idx < 0) idx = urls.findIndex(u => typeof u === 'string' && /openai/.test(u))
      if (idx >= 0) {
        urls[idx] = baseUrl
        keys[idx] = apiKey
        api_configs[String(idx)] = { ...(api_configs[String(idx)] || {}), enable: true }
      } else {
        urls.push(baseUrl)
        keys.push(apiKey)
        const newIdx = urls.length - 1
        api_configs[String(newIdx)] = { ...(api_configs[String(newIdx)] || {}), enable: true }
      }

      const payload = {
        connections: {
          openai: {
            api_base_urls: urls,
            api_keys: keys,
            api_configs,
          },
        },
      }
      const res = await fetch("/api/connections/config/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to save OpenAI connection")
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


