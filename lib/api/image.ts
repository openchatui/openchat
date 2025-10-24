import { absoluteUrl, httpFetch } from './http'

export type ImageProvider = 'openai' | 'comfyui' | 'automatic1111'

export interface ImageConfigResponse {
  image: {
    provider: ImageProvider
    openai: {
      baseUrl: string
      apiKey: string
      model: string
      size: string
      quality?: string
      style?: string
    }
  }
}

export interface UpdateImageConfigInput {
  provider?: ImageProvider
  openai?: {
    baseUrl?: string
    apiKey?: string
    model?: string
    size?: string
    quality?: string
    style?: string
  }
}

export async function getImageConfig(): Promise<ImageConfigResponse> {
  const res = await httpFetch(absoluteUrl('/api/v1/images/config'), { method: 'GET' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new Error((data as { error?: string }).error || 'Failed to fetch image config')
  }
  return (await res.json()) as ImageConfigResponse
}

export async function updateImageConfig(input: UpdateImageConfigInput): Promise<void> {
  const res = await httpFetch(absoluteUrl('/api/v1/images/config/update'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: input }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new Error((data as { error?: string }).error || 'Failed to update image config')
  }
}


