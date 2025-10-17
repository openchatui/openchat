export type UpdateAudioConfigInput = {
  audio: Partial<{
    ttsEnabled: boolean
    sttEnabled: boolean
    tts: Partial<{ provider: 'openai' | 'elevenlabs'; voiceId: string; modelId: string }>
    stt: Partial<{ provider: 'whisper-web' | 'openai' | 'webapi' | 'deepgram'; whisperWeb: Partial<{ model: string }> }>
  }>
}

export async function updateAudioConfig(input: UpdateAudioConfigInput): Promise<void> {
  const res = await fetch('/api/v1/audio/config/update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to update audio config')
  }
}

export async function setElevenLabsApiKey(apiKey: string): Promise<void> {
  const payload = { connections: { elevenlabs: { api_keys: [apiKey] } } }
  const res = await fetch('/api/connections/config/update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to save ElevenLabs API key')
  }
}


