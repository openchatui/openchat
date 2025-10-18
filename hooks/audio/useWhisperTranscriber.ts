import { useCallback, useMemo, useState } from 'react'
import { useWhisperWorker } from '@/hooks/audio/useWhisperWorker'
import { useAudio } from '@/hooks/audio/useAudio'

export interface TranscriberData {
  text: string
}

export interface Transcriber {
  onInputChange: () => void
  isProcessing: boolean
  isModelLoading: boolean
  modelLoadingProgress: number
  start: (audioData: AudioBuffer | undefined) => void
  output?: TranscriberData
}

export function useWhisperTranscriber(): Transcriber {
  const [output, setOutput] = useState<TranscriberData | undefined>()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelLoadingProgress, setModelLoadingProgress] = useState(0)
  const { sttProvider, whisperWebModel } = useAudio()

  const webWorker = useWhisperWorker(event => {
    const message = event.data

    switch (message.status) {
      case 'progress':
        setModelLoadingProgress(message.progress)
        break
      case 'update':
        break
      case 'complete':
        setOutput(message.data)
        setIsProcessing(false)
        break
      case 'initiate':
        setIsModelLoading(true)
        break
      case 'ready':
        setIsModelLoading(false)
        break
      case 'error':
        setIsProcessing(false)
        break
      case 'done':
        break
      default:
        break
    }
  })

  const onInputChange = useCallback(() => {
    setOutput(undefined)
  }, [])

  const start = useCallback(
    async (audioData: AudioBuffer | undefined) => {
      if (audioData) {
        setOutput(undefined)
        setIsProcessing(true)

        let audio
        if (audioData.numberOfChannels === 2) {
          const SCALING_FACTOR = Math.sqrt(2)

          const left = audioData.getChannelData(0)
          const right = audioData.getChannelData(1)

          audio = new Float32Array(left.length)
          for (let i = 0; i < audioData.length; ++i) {
            audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2
          }
        } else {
          audio = audioData.getChannelData(0)
        }

        const payload: any = { audio }
        if (sttProvider === 'whisper-web' && typeof whisperWebModel === 'string' && whisperWebModel.length > 0) {
          payload.model = whisperWebModel
        }
        webWorker?.postMessage(payload)
      }
    },
    [webWorker, sttProvider, whisperWebModel]
  )

  const transcriber = useMemo(() => {
    return {
      onInputChange,
      isProcessing,
      isModelLoading,
      modelLoadingProgress,
      start,
      output
    }
  }, [onInputChange, isProcessing, isModelLoading, modelLoadingProgress, start, output])

  return transcriber
}


