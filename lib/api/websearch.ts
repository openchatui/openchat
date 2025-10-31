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
  // Server-side optimization: call DB directly
  if (typeof window === 'undefined') {
    try {
      const { getWebsearchConfigData } = await import('@/lib/db/websearch.db')
      const data = (await getWebsearchConfigData()) as any
      const websearch = data?.websearch && typeof data.websearch === 'object' ? data.websearch : {}
      return {
        websearch: {
          ENABLED: Boolean(websearch.ENABLED),
          ENABLED_BY_DEFAULT: Boolean(websearch.ENABLED_BY_DEFAULT),
          SYSTEM_PROMPT: typeof websearch.SYSTEM_PROMPT === 'string' ? websearch.SYSTEM_PROMPT : null,
          PROVIDER: (['browserless', 'googlepse'].includes(String(websearch.PROVIDER).toLowerCase()) ? String(websearch.PROVIDER).toLowerCase() : 'browserless') as WebSearchProvider,
          browserless: websearch.browserless || {},
          googlepse: websearch.googlepse || { apiKey: '', engineId: '', resultCount: 5, domainFilters: [] },
          ENV_SYSTEM_PROMPT: typeof process.env.BROWSERLESS_SYSTEM_PROMPT === 'string' ? process.env.BROWSERLESS_SYSTEM_PROMPT : null,
        }
      }
    } catch (err) {
      console.error('[getWebSearchConfig] Direct DB call failed:', err)
      // Fall through to HTTP
    }
  }
  
  // Client-side or fallback: use HTTP
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


