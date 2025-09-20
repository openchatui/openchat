"use client"

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { updateAudioConfigAction } from '@/actions/audio'

type SttProvider = 'whisper-web' | 'openai' | 'webapi' | 'deepgram'
type TtsProvider = 'openai' | 'elevenlabs'

interface AppConfigContextValue {
  // Features
  webSearchAvailable: boolean
  imageAvailable: boolean

  // Audio
  ttsEnabled: boolean
  sttEnabled: boolean
  ttsProvider: TtsProvider
  sttProvider: SttProvider
  whisperWebModel: string

  // Mutations (persist to server and update local state)
  toggleTtsEnabled: (enabled: boolean) => void
  toggleSttEnabled: (enabled: boolean) => void
  setTtsProvider: (provider: TtsProvider) => void
  setSttProvider: (provider: SttProvider) => void
  setWhisperWebModel: (model: string) => void
}

const AppConfigContext = createContext<AppConfigContextValue | null>(null)

interface AppConfigProviderProps {
  initial: {
    webSearchAvailable: boolean
    imageAvailable: boolean
    audio: {
      ttsEnabled: boolean
      sttEnabled: boolean
      ttsProvider: TtsProvider
      sttProvider: SttProvider
      whisperWebModel: string
    }
  }
  children: React.ReactNode
}

const AUDIO_API_BASE = '/api/v1/audio/config'

export function AppConfigProvider({ initial, children }: AppConfigProviderProps) {
  const [webSearchAvailable] = useState<boolean>(Boolean(initial.webSearchAvailable))
  const [imageAvailable] = useState<boolean>(Boolean(initial.imageAvailable))

  const [ttsEnabled, setTtsEnabled] = useState<boolean>(Boolean(initial.audio.ttsEnabled))
  const [sttEnabled, setSttEnabled] = useState<boolean>(Boolean(initial.audio.sttEnabled))
  const [ttsProvider, setTtsProviderState] = useState<TtsProvider>(initial.audio.ttsProvider)
  const [sttProvider, setSttProviderState] = useState<SttProvider>(initial.audio.sttProvider)
  const [whisperWebModel, setWhisperWebModelState] = useState<string>(initial.audio.whisperWebModel)

  const toggleTtsEnabled = useCallback((enabled: boolean) => {
    setTtsEnabled(enabled)
    ;(async () => {
      try {
        await updateAudioConfigAction({ audio: { ttsEnabled: enabled } })
      } catch {
        setTtsEnabled(prev => !enabled)
      }
    })()
  }, [])

  const toggleSttEnabled = useCallback((enabled: boolean) => {
    setSttEnabled(enabled)
    ;(async () => {
      try {
        await updateAudioConfigAction({ audio: { sttEnabled: enabled } })
      } catch {
        setSttEnabled(prev => !enabled)
      }
    })()
  }, [])

  const setTtsProvider = useCallback((provider: TtsProvider) => {
    setTtsProviderState(provider)
    ;(async () => {
      try {
        await updateAudioConfigAction({ audio: { tts: { provider } } })
      } catch {}
    })()
  }, [])

  const setSttProvider = useCallback((provider: SttProvider) => {
    setSttProviderState(provider)
    ;(async () => {
      try {
        await updateAudioConfigAction({ audio: { stt: { provider } } })
      } catch {}
    })()
  }, [])

  const setWhisperWebModel = useCallback((model: string) => {
    setWhisperWebModelState(model)
    ;(async () => {
      try {
        await updateAudioConfigAction({ audio: { stt: { whisperWeb: { model } } } })
      } catch {}
    })()
  }, [])

  const value = useMemo<AppConfigContextValue>(() => ({
    webSearchAvailable,
    imageAvailable,
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
  }), [webSearchAvailable, imageAvailable, ttsEnabled, sttEnabled, ttsProvider, sttProvider, whisperWebModel, toggleTtsEnabled, toggleSttEnabled, setTtsProvider, setSttProvider, setWhisperWebModel])

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  )
}

export function useAppConfig() {
  const ctx = useContext(AppConfigContext)
  if (!ctx) throw new Error('useAppConfig must be used within AppConfigProvider')
  return ctx
}


