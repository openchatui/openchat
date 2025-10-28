export type ImageProvider = 'openai' | 'comfyui' | 'automatic1111'

export interface OpenAIImageConfig {
  baseUrl: string
  apiKey: string
  model: string
  size: string
  quality?: string
  style?: string
}

export interface ImageConfig {
  provider: ImageProvider
  openai: OpenAIImageConfig
}


