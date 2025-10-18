/**
 * Whisper Transcription Service
 */
export class WhisperService {
  /**
   * Available Whisper models
   */
  static readonly AVAILABLE_MODELS = [
    'Xenova/whisper-tiny.en',
    'Xenova/whisper-base.en', 
    'Xenova/whisper-small.en',
    'Xenova/whisper-medium.en',
    'Xenova/whisper-large-v3',
  ] as const;

  /**
   * Default model configuration
   */
  static readonly DEFAULT_MODEL = 'Xenova/whisper-tiny.en';

  /**
   * Transcription options
   */
  static readonly DEFAULT_OPTIONS = {
    chunk_length_s: 30,
    stride_length_s: 5,
  };

  /**
   * Create a Whisper worker instance
   */
  static createWorker(modelName?: string): Worker {
    const worker = new Worker('/lib/features/audio/transcription/whisper-worker.js');
    
    // Configure the worker with the specified model
    if (modelName && this.AVAILABLE_MODELS.includes(modelName as any)) {
      worker.postMessage({ 
        type: 'configure',
        model: modelName 
      });
    }
    
    return worker;
  }

  /**
   * Transcribe audio using Web Worker
   */
  static async transcribeAudio(
    audioData: ArrayBuffer | Float32Array,
    options?: {
      model?: string;
      chunkLength?: number;
      strideLength?: number;
      onProgress?: (progress: any) => void;
    }
  ): Promise<{ text: string; segments?: any[] }> {
    return new Promise((resolve, reject) => {
      const worker = this.createWorker(options?.model);
      
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Transcription timeout'));
      }, 60000); // 60 second timeout

      worker.onmessage = (event) => {
        const { status, data, task } = event.data;
        
        if (task === 'automatic-speech-recognition') {
          switch (status) {
            case 'initiate':
              options?.onProgress?.({ status: 'loading', message: 'Loading model...' });
              break;
              
            case 'ready':
              options?.onProgress?.({ status: 'ready', message: 'Model ready, processing...' });
              break;
              
            case 'complete':
              clearTimeout(timeout);
              worker.terminate();
              resolve({
                text: data?.text || '',
                segments: data?.chunks || []
              });
              break;
              
            case 'error':
              clearTimeout(timeout);
              worker.terminate();
              reject(new Error(data || 'Transcription failed'));
              break;
              
            default:
              // Progress updates
              options?.onProgress?.(event.data);
          }
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error(`Worker error: ${error.message}`));
      };

      // Send audio data to worker
      worker.postMessage({
        audio: audioData,
        model: options?.model || this.DEFAULT_MODEL,
        options: {
          chunk_length_s: options?.chunkLength || this.DEFAULT_OPTIONS.chunk_length_s,
          stride_length_s: options?.strideLength || this.DEFAULT_OPTIONS.stride_length_s,
        }
      });
    });
  }

  /**
   * Get model info
   */
  static getModelInfo(modelName: string) {
    const models = {
      'Xenova/whisper-tiny.en': { size: '39MB', languages: ['en'], speed: 'fastest' },
      'Xenova/whisper-base.en': { size: '74MB', languages: ['en'], speed: 'fast' },
      'Xenova/whisper-small.en': { size: '244MB', languages: ['en'], speed: 'medium' },
      'Xenova/whisper-medium.en': { size: '769MB', languages: ['en'], speed: 'slow' },
      'Xenova/whisper-large-v3': { size: '1550MB', languages: ['multilingual'], speed: 'slowest' },
    };
    
    return models[modelName as keyof typeof models] || null;
  }
}
