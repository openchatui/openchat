import { useState } from 'react'

export interface MessageEventHandler {
  (event: MessageEvent): void
}

export function useWhisperWorker(
  messageEventHandler: MessageEventHandler
): Worker | null {
  const [worker] = useState(() => createWorker(messageEventHandler))
  return worker
}

function createWorker(messageEventHandler: MessageEventHandler): Worker | null {
  if (typeof window === 'undefined') return null

  const worker = new Worker(new URL('../lib/features/audio/transcription/whisper-worker.js', import.meta.url), {
    type: 'module'
  })

  worker.addEventListener('message', messageEventHandler)
  return worker
}


