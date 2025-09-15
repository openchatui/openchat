import { useCallback, useEffect, useRef, useState } from 'react'
import { useWhisperTranscriber } from '@/hooks/useWhisperTranscriber'
import { useAudio } from '@/hooks/useAudio'

interface UseVoiceInputOptions {
  onTranscription?: (text: string) => void
}

export function useVoiceInput(options?: UseVoiceInputOptions) {
  const transcriber = useWhisperTranscriber()
  const { sttEnabled, sttProvider: rawProvider } = useAudio()
  type SttProvider = 'whisper-web' | 'openai' | 'webapi' | 'deepgram'
  const sttProvider: SttProvider = (() => {
    switch (rawProvider) {
      case 'webapi':
      case 'openai':
      case 'deepgram':
      case 'whisper-web':
        return rawProvider as SttProvider
      default:
        return 'whisper-web'
    }
  })()

  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const onTranscriptionRef = useRef<((text: string) => void) | undefined>(
    options?.onTranscription
  )
  const lastTranscriptRef = useRef<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const shouldTranscribeRef = useRef<boolean>(true)
  const [isTranscribingWeb, setIsTranscribingWeb] = useState(false)
  const [isTranscribingOpenAI, setIsTranscribingOpenAI] = useState(false)
  const [isTranscribingDeepgram, setIsTranscribingDeepgram] = useState(false)

  // Keep the latest callback without causing effect churn
  useEffect(() => {
    onTranscriptionRef.current = options?.onTranscription
  }, [options?.onTranscription])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // If using Web Speech API, start recognition and keep stream only for waveform UI
      if (sttEnabled && sttProvider === 'webapi') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
          console.warn('Web Speech API not supported in this browser')
          return
        }
        const recognition = new SpeechRecognition()
        recognition.lang = 'en-US'
        recognition.continuous = false
        recognition.interimResults = false
        recognition.maxAlternatives = 1

        recognition.onstart = () => {
          setIsRecording(true)
          setIsTranscribingWeb(true)
        }
        recognition.onresult = (event: any) => {
          try {
            const result = event.results?.[0]?.[0]?.transcript
            if (typeof result === 'string' && result.length > 0) {
              onTranscriptionRef.current?.(result)
              lastTranscriptRef.current = result
            }
          } catch {}
        }
        recognition.onerror = () => {
          setIsTranscribingWeb(false)
          setIsRecording(false)
        }
        recognition.onend = () => {
          setIsTranscribingWeb(false)
          setIsRecording(false)
        }

        recognitionRef.current = recognition
        recognition.start()
        // Timer for UI elapsed seconds
        setRecordingSeconds(0)
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        timerRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1)
        }, 1000)
        return
      }

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      setRecordingSeconds(0)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1)
      }, 1000)

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        try {
          if (shouldTranscribeRef.current) {
            if (sttEnabled && sttProvider === 'openai') {
              try {
                setIsTranscribingOpenAI(true)
                const blob = new Blob(audioChunksRef.current, { type: audioChunksRef.current[0]?.type || 'audio/webm' })
                const form = new FormData()
                form.append('file', blob, 'audio.webm')
                form.append('model', 'whisper-1')
                const res = await fetch('/api/v1/audio/stt/openai', { method: 'POST', body: form })
                if (!res.ok) throw new Error('OpenAI transcription failed')
                const data = await res.json()
                const text = (data?.text as string) || (data?.result as string) || ''
                if (text) {
                  onTranscriptionRef.current?.(text)
                  lastTranscriptRef.current = text
                }
              } catch (err) {
                console.error(err)
              } finally {
                setIsTranscribingOpenAI(false)
              }
              return
            }
            if (sttEnabled && sttProvider === 'deepgram') {
              try {
                setIsTranscribingDeepgram(true)
                const blob = new Blob(audioChunksRef.current, { type: audioChunksRef.current[0]?.type || 'audio/webm' })
                const form = new FormData()
                form.append('file', blob, 'audio.webm')
                form.append('model', 'nova-2')
                const res = await fetch('/api/v1/audio/stt/deepgram', { method: 'POST', body: form })
                if (!res.ok) throw new Error('Deepgram transcription failed')
                const data = await res.json()
                const text = (data?.text as string) || ''
                if (text) {
                  onTranscriptionRef.current?.(text)
                  lastTranscriptRef.current = text
                }
              } catch (err) {
                console.error(err)
              } finally {
                setIsTranscribingDeepgram(false)
              }
              return
            }
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
            const fileReader = new FileReader()
            fileReader.onloadend = async () => {
              const audioCTX = new AudioContext({ sampleRate: 16000 })
              const arrayBuffer = fileReader.result as ArrayBuffer
              const decoded = await audioCTX.decodeAudioData(arrayBuffer)
              transcriber.onInputChange()
              transcriber.start(decoded)
            }
            fileReader.readAsArrayBuffer(audioBlob)
          }
        } finally {
          // Always cleanup the stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }
          audioChunksRef.current = []
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }, [transcriber, sttEnabled, sttProvider])

  const cancelRecording = useCallback(() => {
    shouldTranscribeRef.current = false
    if (sttEnabled && sttProvider === 'webapi' && recognitionRef.current) {
      try { recognitionRef.current.abort?.() } catch {}
      setIsTranscribingWeb(false)
      setIsRecording(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
      return
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording, sttEnabled, sttProvider])

  const finishRecording = useCallback(() => {
    shouldTranscribeRef.current = true
    if (sttEnabled && sttProvider === 'webapi' && recognitionRef.current) {
      try { recognitionRef.current.stop?.() } catch {}
      setIsTranscribingWeb(false)
      setIsRecording(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
      return
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording, sttEnabled, sttProvider])

  useEffect(() => {
    const text = transcriber.output?.text
    if (text && text !== lastTranscriptRef.current) {
      lastTranscriptRef.current = text
      onTranscriptionRef.current?.(text)
    }
  }, [transcriber.output?.text])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  return {
    isRecording,
    isTranscribing: sttEnabled && sttProvider === 'webapi'
      ? isTranscribingWeb
      : sttEnabled && sttProvider === 'openai'
      ? isTranscribingOpenAI
      : sttEnabled && sttProvider === 'deepgram'
      ? isTranscribingDeepgram
      : transcriber.isProcessing,
    isModelLoading: sttEnabled && (sttProvider === 'webapi' || sttProvider === 'openai' || sttProvider === 'deepgram') ? false : transcriber.isModelLoading,
    modelLoadingProgress: sttEnabled && (sttProvider === 'webapi' || sttProvider === 'openai' || sttProvider === 'deepgram') ? 0 : transcriber.modelLoadingProgress,
    recordingSeconds,
    stream: streamRef.current,
    startRecording,
    cancelRecording,
    finishRecording
  }
}


