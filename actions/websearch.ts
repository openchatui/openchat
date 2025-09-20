"use server"

import db from "@/lib/db"

export interface WebSearchConfig {
  ENABLED: boolean
  SYSTEM_PROMPT: string
  ENV_SYSTEM_PROMPT: string
  PROVIDER: 'browserless' | 'googlepse'
  browserless: { apiKey?: string; ENV_API_KEY?: string | null }
  googlepse: { apiKey?: string; engineId?: string; resultCount?: number; domainFilters?: string[] }
}

export async function getWebSearchConfigAction(): Promise<WebSearchConfig> {
  const row = await (db as any).config.findUnique({ where: { id: 1 } })
  const data = (row?.data || {}) as any
  const ws = (data && typeof data === 'object' && (data as any).websearch) ? (data as any).websearch : {}
  const enabled = Boolean(ws.ENABLED)
  const prompt = typeof ws.SYSTEM_PROMPT === 'string' ? String(ws.SYSTEM_PROMPT) : ''
  const providerRaw = typeof ws.PROVIDER === 'string' ? String(ws.PROVIDER).toLowerCase() : 'browserless'
  const provider: 'browserless' | 'googlepse' = providerRaw === 'googlepse' ? 'googlepse' : 'browserless'
  const browserless = (ws.browserless && typeof ws.browserless === 'object') ? ws.browserless as any : {}
  const googlepse = (ws.googlepse && typeof ws.googlepse === 'object') ? ws.googlepse as any : {}
  const envPrompt = process.env.WEBSEARCH_SYSTEM_PROMPT || ''
  const envBlKey = process.env.BROWSERLESS_API_KEY || null
  return {
    ENABLED: enabled,
    SYSTEM_PROMPT: prompt,
    ENV_SYSTEM_PROMPT: envPrompt,
    PROVIDER: provider,
    browserless: { apiKey: typeof browserless.apiKey === 'string' ? String(browserless.apiKey) : undefined, ENV_API_KEY: envBlKey },
    googlepse: {
      apiKey: typeof googlepse.apiKey === 'string' ? String(googlepse.apiKey) : undefined,
      engineId: typeof googlepse.engineId === 'string' ? String(googlepse.engineId) : undefined,
      resultCount: Number.isFinite(googlepse.resultCount) ? Number(googlepse.resultCount) : 5,
      domainFilters: Array.isArray(googlepse.domainFilters) ? (googlepse.domainFilters as any[]).filter(v => typeof v === 'string') : [],
    }
  }
}

export async function updateWebSearchConfigAction(payload: any): Promise<void> {
  const row = await (db as any).config.findUnique({ where: { id: 1 } })
  const current = (row?.data || {}) as any
  const next = { ...current, websearch: { ...(current?.websearch || {}), ...((payload || {}).websearch || {}) } }
  if (row) await (db as any).config.update({ where: { id: 1 }, data: { data: next } })
  else await (db as any).config.create({ data: { id: 1, data: next } })
}


