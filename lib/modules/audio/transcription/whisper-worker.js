import { pipeline, env } from '@huggingface/transformers'

// Configure environment for browser/worker
env.allowLocalModels = false
env.useFS = false
env.useFSCache = false
env.useBrowserCache = true

class PipelineFactory {
  static task = null
  static model = null
  static instance = null

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      // Prefer WebGPU when available, fallback to CPU/wasm
      const device = typeof navigator !== 'undefined' && navigator && 'gpu' in navigator ? 'webgpu' : 'cpu'
      this.instance = pipeline(this.task, this.model, { progress_callback, device })
    }

    return this.instance
  }
}

self.addEventListener('message', async event => {
  const message = event.data

  // If a model is provided and different from current, reset pipeline instance
  if (typeof message.model === 'string' && message.model.length > 0) {
    if (AutomaticSpeechRecognitionPipelineFactory.model !== message.model) {
      AutomaticSpeechRecognitionPipelineFactory.model = message.model
      AutomaticSpeechRecognitionPipelineFactory.instance = null
    }
  }

  let transcript = await transcribe(message.audio)
  if (transcript === null) return

  self.postMessage({
    status: 'complete',
    task: 'automatic-speech-recognition',
    data: transcript
  })
})

class AutomaticSpeechRecognitionPipelineFactory extends PipelineFactory {
  static task = 'automatic-speech-recognition'
  static model = 'Xenova/whisper-tiny.en'
}

const transcribe = async audio => {
  const p = AutomaticSpeechRecognitionPipelineFactory
  // Notify UI that model loading is starting
  self.postMessage({ status: 'initiate', task: 'automatic-speech-recognition' })

  let transcriber
  try {
    transcriber = await p.getInstance(data => self.postMessage(data))
  } catch (error) {
    self.postMessage({
      status: 'error',
      task: 'automatic-speech-recognition',
      data: error?.message || String(error)
    })
    return null
  }

  // Signal that the model is ready
  self.postMessage({ status: 'ready', task: 'automatic-speech-recognition' })

  let options = {
    chunk_length_s: 30,
    stride_length_s: 5
  }

  let output = await transcriber(audio, options).catch(error => {
    self.postMessage({
      status: 'error',
      task: 'automatic-speech-recognition',
      data: error?.message || String(error)
    })
    return null
  })

  return output
}


