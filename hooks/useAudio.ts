import { useCallback, useEffect, useRef, useState } from 'react'

type SttProvider = 'whisper-web' | 'openai' | 'webapi' | 'deepgram'
type TtsProvider = 'openai' | 'elevenlabs'

interface UseAudioState {
  isLoading: boolean
  ttsEnabled: boolean
  sttEnabled: boolean
  ttsProvider: TtsProvider
  sttProvider: SttProvider
  whisperWebModel: string
  toggleTtsEnabled: (enabled: boolean) => void
  toggleSttEnabled: (enabled: boolean) => void
  setTtsProvider: (provider: TtsProvider) => void
  setSttProvider: (provider: SttProvider) => void
  setWhisperWebModel: (model: string) => void
}

const API_BASE = '/api/v1/audio/config'

export function useAudio(): UseAudioState {
  const [isLoading, setIsLoading] = useState(true)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [sttEnabled, setSttEnabled] = useState(false)
  const [ttsProvider, setTtsProviderState] = useState<TtsProvider>('openai')
  const [sttProvider, setSttProviderState] = useState<SttProvider>('whisper-web')
  const [whisperWebModel, setWhisperWebModelState] = useState<string>('')

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const load = async () => {
      try {
        const res = await fetch(API_BASE, { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load audio config')
        const data = await res.json()
        const audio = (data?.audio ?? {}) as any
        if (mountedRef.current) {
          setTtsEnabled(Boolean(audio.ttsEnabled))
          setSttEnabled(Boolean(audio.sttEnabled))
          const ttsProv: TtsProvider =
            typeof audio?.tts?.provider === 'string'
              ? (audio.tts.provider as TtsProvider)
              : 'openai'
          setTtsProviderState(ttsProv)
          const provider: SttProvider =
            typeof audio?.stt?.provider === 'string'
              ? (audio.stt.provider as SttProvider)
              : 'whisper-web'
          setSttProviderState(provider)
          const wwModel = typeof audio?.stt?.whisperWeb?.model === 'string' ? audio.stt.whisperWeb.model : ''
          setWhisperWebModelState(wwModel)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (mountedRef.current) setIsLoading(false)
      }
    }
    load()
    return () => {
      mountedRef.current = false
    }
  }, [])

  const toggleTtsEnabled = useCallback((enabled: boolean) => {
    setTtsEnabled(enabled)
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: { ttsEnabled: enabled } }),
        })
        if (!res.ok) throw new Error('Failed to save TTS setting')
      } catch (err) {
        console.error(err)
        if (mountedRef.current) setTtsEnabled(prev => !enabled)
      }
    })()
  }, [])

  const toggleSttEnabled = useCallback((enabled: boolean) => {
    setSttEnabled(enabled)
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: { sttEnabled: enabled } }),
        })
        if (!res.ok) throw new Error('Failed to save STT setting')
      } catch (err) {
        console.error(err)
        if (mountedRef.current) setSttEnabled(prev => !enabled)
      }
    })()
  }, [])

  const setTtsProvider = useCallback((provider: TtsProvider) => {
    setTtsProviderState(provider)
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: { tts: { provider } } }),
        })
        if (!res.ok) throw new Error('Failed to save TTS provider')
      } catch (err) {
        console.error(err)
      }
    })()
  }, [])

  const setSttProvider = useCallback((provider: SttProvider) => {
    setSttProviderState(provider)
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: { stt: { provider } } }),
        })
        if (!res.ok) throw new Error('Failed to save STT provider')
      } catch (err) {
        console.error(err)
      }
    })()
  }, [])

  const setWhisperWebModel = useCallback((model: string) => {
    setWhisperWebModelState(model)
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/update`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: { stt: { whisperWeb: { model } } } }),
        })
        if (!res.ok) throw new Error('Failed to save Whisper Web model')
      } catch (err) {
        console.error(err)
      }
    })()
  }, [])

  return {
    isLoading,
    ttsEnabled,
    sttEnabled,
    ttsProvider,
    sttProvider,
    whisperWebModel,
    toggleTtsEnabled,
    toggleSttEnabled,
    setTtsProvider,
    setSttProvider,
    setWhisperWebModel,
  }
}


