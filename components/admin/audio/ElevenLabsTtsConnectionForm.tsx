"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ApiKeyField } from "@/components/admin/ApiKeyField"
import { setElevenLabsApiKey } from "@/actions/connections"
import { updateAudioConfigAction } from "@/actions/audio"

interface ElevenLabsTtsConnectionFormProps {
  initialApiKey?: string
  initialVoiceId?: string
  initialModelId?: string
}

export function ElevenLabsTtsConnectionForm({ initialApiKey = "", initialVoiceId = "", initialModelId = "" }: ElevenLabsTtsConnectionFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [apiKey, setApiKey] = useState(initialApiKey)
  const [savedOk, setSavedOk] = useState(false)
  const [voices, setVoices] = useState<Array<{ id: string; name: string }>>([])
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([])
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<string>(initialVoiceId)
  const [selectedModel, setSelectedModel] = useState<string>(initialModelId)

  useEffect(() => {
    // Set initial state from server-provided props
    setSavedOk(Boolean(initialApiKey))
    setIsLoading(false)
  }, [initialApiKey])

  const onSave = async (keyToSave: string) => {
    await setElevenLabsApiKey(keyToSave)
  }

  // Auto-save handled by ApiKeyField

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
        <ApiKeyField
          label="ElevenLabs API Key"
          value={apiKey}
          onChange={setApiKey}
          onSave={onSave}
          isLoading={isLoading}
          placeholder="eleven_..."
          initiallySaved={savedOk}
          onSavedChange={(ok, val) => setSavedOk(ok && val.length > 0)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label>Voices</Label>
            <Select
              value={selectedVoice}
                onValueChange={async (val) => {
                setSelectedVoice(val)
                try {
                  await updateAudioConfigAction({ audio: { tts: { voiceId: val } } })
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
                  await updateAudioConfigAction({ audio: { tts: { modelId: val } } })
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




