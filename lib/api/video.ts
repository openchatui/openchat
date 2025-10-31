import { absoluteUrl, httpFetch } from './http'

export type VideoProvider = 'openai'

export interface VideoConfigResponse {
  video: {
    enabled: boolean
    provider: VideoProvider
    openai: {
      model: string
      size: string
      seconds: number
    }
  }
}

export interface UpdateVideoConfigInput {
  enabled?: boolean
  provider?: VideoProvider
  openai?: {
    model?: string
    size?: string
    seconds?: number
  }
}

export async function getVideoConfig(): Promise<VideoConfigResponse> {
  const res = await httpFetch(absoluteUrl('/api/v1/videos/config'), { method: 'GET' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new Error((data as { error?: string }).error || 'Failed to fetch video config')
  }
  return (await res.json()) as VideoConfigResponse
}

export async function updateVideoConfig(input: UpdateVideoConfigInput): Promise<void> {
  const res = await httpFetch(absoluteUrl('/api/v1/videos/config/update'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video: input }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new Error((data as { error?: string }).error || 'Failed to update video config')
  }
}


