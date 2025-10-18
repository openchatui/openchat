import { useCallback } from 'react'
import { useAppConfig } from '@/components/providers/AppConfigProvider'

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

export function useAudio(): UseAudioState {
  const cfg = useAppConfig()

  const toggleTtsEnabled = useCallback((enabled: boolean) => {
    cfg.toggleTtsEnabled(enabled)
  }, [cfg])

  const toggleSttEnabled = useCallback((enabled: boolean) => {
    cfg.toggleSttEnabled(enabled)
  }, [cfg])

  const setTtsProvider = useCallback((provider: TtsProvider) => {
    cfg.setTtsProvider(provider)
  }, [cfg])

  const setSttProvider = useCallback((provider: SttProvider) => {
    cfg.setSttProvider(provider)
  }, [cfg])

  const setWhisperWebModel = useCallback((model: string) => {
    cfg.setWhisperWebModel(model)
  }, [cfg])

  return {
    isLoading: false,
    ttsEnabled: cfg.ttsEnabled,
    sttEnabled: cfg.sttEnabled,
    ttsProvider: cfg.ttsProvider as TtsProvider,
    sttProvider: cfg.sttProvider as SttProvider,
    whisperWebModel: cfg.whisperWebModel,
    toggleTtsEnabled,
    toggleSttEnabled,
    setTtsProvider,
    setSttProvider,
    setWhisperWebModel,
  }
}


