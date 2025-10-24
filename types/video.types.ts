export type VideoProvider = 'openai'

export interface OpenAIVideoConfig {
  model: string
  size: string
  seconds: number
}

export interface VideoConfig {
  enabled: boolean
  provider: VideoProvider
  openai: OpenAIVideoConfig
}


