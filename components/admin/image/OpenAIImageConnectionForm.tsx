"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateOpenAIImageConfigAction } from "@/actions/image"
import { toast } from "sonner"

const OPENAI_IMAGE_MODELS = [
  "gpt-image-1",
  "o4-mini",
  "o3-mini",
  "dall-e-3",
]

export function OpenAIImageConnectionForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState<string>(OPENAI_IMAGE_MODELS[0])
  const [imageSize, setImageSize] = useState<string>("1024x1024")

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
        const apiConfigs = (openai.api_configs || {}) as Record<string, any>
        const imageCfg = idx >= 0 ? (apiConfigs[String(idx)]?.image || {}) : {}
        if (active) {
          if (typeof existingBase === "string") setBaseUrl(existingBase)
          if (typeof existingKey === "string") setApiKey(existingKey)
          if (typeof imageCfg.model === 'string' && imageCfg.model) setModel(imageCfg.model)
          if (typeof imageCfg.size === 'string' && imageCfg.size) setImageSize(imageCfg.size)
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
        api_configs[String(idx)] = { ...(api_configs[String(idx)] || {}), enable: true, image: { model, size: imageSize } }
      } else {
        urls.push(baseUrl)
        keys.push(apiKey)
        const newIdx = urls.length - 1
        api_configs[String(newIdx)] = { ...(api_configs[String(newIdx)] || {}), enable: true, image: { model, size: imageSize } }
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

      // Persist explicit image config for generator service consumers
      await updateOpenAIImageConfigAction({ baseUrl, apiKey, model, size: imageSize })

      toast.success("OpenAI image configuration saved")
    } catch (e: any) {
      const message = e?.message || "Failed to save image configuration"
      toast.error(message)
      return
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Model</Label>
          <Select value={model} onValueChange={setModel} disabled={isLoading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select OpenAI image model" />
            </SelectTrigger>
            <SelectContent>
              {OPENAI_IMAGE_MODELS.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Image size</Label>
          <Input
            placeholder="e.g. 1024x1024"
            value={imageSize}
            onChange={e => setImageSize(e.target.value)}
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


