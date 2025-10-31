import { absoluteUrl, httpFetch } from './http'

export type WebSearchProvider = 'browserless' | 'googlepse'

export interface WebSearchConfigResponse {
  websearch: {
    ENABLED: boolean
    ENABLED_BY_DEFAULT: boolean
    SYSTEM_PROMPT: string | null
    PROVIDER: WebSearchProvider
    browserless: {
      apiKey: string
      stealth?: boolean
      stealthRoute?: boolean
      blockAds?: boolean
      headless?: boolean
      locale?: string
      timezone?: string
      userAgent?: string
      route?: string
    }
    googlepse: { apiKey: string; engineId: string; resultCount: number; domainFilters: string[] }
    ENV_SYSTEM_PROMPT: string | null
  }
}

type BrowserlessUpdate = {
  browserless?: {
    apiKey?: string
    stealth?: boolean
    stealthRoute?: boolean
    blockAds?: boolean
    headless?: boolean
    locale?: string
    timezone?: string
    userAgent?: string
    route?: string
    systemPrompt?: string
  }
}

type GooglePseUpdate = {
  googlepse?: {
    apiKey?: string
    engineId?: string
    resultCount?: number
    domainFilters?: string[]
    systemPrompt?: string
  }
}

export type UpdateWebSearchPayload = {
  websearch: {
    ENABLED?: boolean
    ENABLED_BY_DEFAULT?: boolean
    SYSTEM_PROMPT?: string
    PROVIDER?: WebSearchProvider
  } & BrowserlessUpdate & GooglePseUpdate
}

export async function getWebSearchConfig(): Promise<WebSearchConfigResponse> {
  const res = await httpFetch(absoluteUrl('/api/v1/websearch/config'), { method: 'GET' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new Error((data as { error?: string }).error || 'Failed to fetch websearch config')
  }
  return (await res.json()) as WebSearchConfigResponse
}

export async function updateWebSearchConfig(payload: UpdateWebSearchPayload): Promise<void> {
  const res = await httpFetch(absoluteUrl('/api/v1/websearch/config/update'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new Error((data as { error?: string }).error || 'Failed to update websearch config')
  }
}


