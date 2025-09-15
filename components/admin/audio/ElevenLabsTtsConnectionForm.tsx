"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ElevenLabsTtsConnectionForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [savedOk, setSavedOk] = useState(false)
  const [voices, setVoices] = useState<Array<{ id: string; name: string }>>([])
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([])
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/connections/config", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        const el = (data?.connections?.elevenlabs ?? {}) as any
        const existingKey = Array.isArray(el.api_keys) ? el.api_keys[0] : undefined
        if (active && typeof existingKey === 'string') {
          setApiKey(existingKey)
          if (existingKey.length > 0) setSavedOk(true)
        }
        // Load current audio TTS selections
        try {
          const audioRes = await fetch('/api/v1/audio/config', { cache: 'no-store' })
          if (audioRes.ok) {
            const aJson = await audioRes.json()
            const aTts = (aJson?.audio?.tts ?? {}) as any
            if (active && typeof aTts.voiceId === 'string') setSelectedVoice(aTts.voiceId)
            if (active && typeof aTts.modelId === 'string') setSelectedModel(aTts.modelId)
          }
        } catch {}
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
      const el = (currentData?.connections?.elevenlabs ?? {}) as any
      const keys: string[] = Array.isArray(el.api_keys) ? [...el.api_keys] : []
      if (keys.length > 0) keys[0] = keyToSave
      else keys.push(keyToSave)

      const payload = { connections: { elevenlabs: { api_keys: keys, api_configs: { ...((el && el.api_configs) || {}) } } } }
      const res = await fetch("/api/connections/config/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save ElevenLabs key')
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
      // Save even if empty to allow clearing the key
      onSave(apiKey)
    }, 600)
    return () => clearTimeout(handle)
  }, [apiKey, isLoading])

  // Load ElevenLabs voices and models after a valid key is saved
  useEffect(() => {
    let active = true
    const load = async () => {
      if (!savedOk || !apiKey) return
      try {
        setVoicesLoading(true)
        const vRes = await fetch('/api/v1/audio/tts/elevenlabs/voices', { cache: 'no-store' })
        if (vRes.ok) {
          const vJson = await vRes.json()
          const vList: Array<{ id: string; name: string }> = Array.isArray(vJson?.voices)
            ? vJson.voices.map((v: any) => ({ id: String(v.voice_id || v.id || ''), name: String(v.name || v.display_name || v.id || '') })).filter((x: any) => x.id)
            : []
          if (active) setVoices(vList)
        }
      } finally {
        if (active) setVoicesLoading(false)
      }
      try {
        setModelsLoading(true)
        const mRes = await fetch('/api/v1/audio/tts/elevenlabs/models', { cache: 'no-store' })
        if (mRes.ok) {
          const mJson = await mRes.json()
          const raw = Array.isArray(mJson) ? mJson : (Array.isArray(mJson?.models) ? mJson.models : [])
          const mList: Array<{ id: string; name: string }> = raw.map((m: any) => ({ id: String(m.model_id || m.id || ''), name: String(m.display_name || m.name || m.model_id || m.id || '') })).filter((x: any) => x.id)
          if (active) setModels(mList)
        }
      } finally {
        if (active) setModelsLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [savedOk, apiKey])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>ElevenLabs API Key</Label>
          <div className="relative">
            <Input
              type="password"
              placeholder="eleven_..."
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>Voices</Label>
            <Select
              value={selectedVoice}
              onValueChange={async (val) => {
                setSelectedVoice(val)
                try {
                  await fetch('/api/v1/audio/config/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audio: { tts: { voiceId: val } } }),
                  })
                } catch {}
              }}
              disabled={!savedOk || voicesLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={voicesLoading ? 'Loading voices…' : (voices.length ? 'Select a voice' : 'No voices found')} />
              </SelectTrigger>
              <SelectContent>
                {voices.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Models</Label>
            <Select
              value={selectedModel}
              onValueChange={async (val) => {
                setSelectedModel(val)
                try {
                  await fetch('/api/v1/audio/config/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audio: { tts: { modelId: val } } }),
                  })
                } catch {}
              }}
              disabled={!savedOk || modelsLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={modelsLoading ? 'Loading models…' : (models.length ? 'Select a model' : 'No models found')} />
              </SelectTrigger>
              <SelectContent>
                {models.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}




