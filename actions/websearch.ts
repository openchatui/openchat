"use server"

import db from "@/lib/db"
import { revalidatePath } from "next/cache"

export interface WebSearchConfig {
  ENABLED: boolean
  SYSTEM_PROMPT: string
  ENV_SYSTEM_PROMPT: string
  PROVIDER: 'browserless' | 'googlepse'
  browserless: {
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
  googlepse: { apiKey?: string; engineId?: string; resultCount?: number; domainFilters?: string[]; systemPrompt?: string }
}

export async function getWebSearchConfigAction(): Promise<WebSearchConfig> {
  const row = await (db as any).config.findUnique({ where: { id: 1 } })
  const data = (row?.data || {}) as any
  const ws = (data && typeof data === 'object' && (data as any).websearch) ? (data as any).websearch : {}
  const enabled = Boolean(ws.ENABLED)
  const providerRaw = typeof ws.PROVIDER === 'string' ? String(ws.PROVIDER).toLowerCase() : 'browserless'
  const provider: 'browserless' | 'googlepse' = providerRaw === 'googlepse' ? 'googlepse' : 'browserless'
  const browserless = (ws.browserless && typeof ws.browserless === 'object') ? ws.browserless as any : {}
  const googlepse = (ws.googlepse && typeof ws.googlepse === 'object') ? ws.googlepse as any : {}
  // Effective prompt for current provider (provider-specific -> toplevel -> '')
  const prompt = provider === 'browserless'
    ? (typeof browserless.systemPrompt === 'string' ? String(browserless.systemPrompt) : (typeof ws.SYSTEM_PROMPT === 'string' ? String(ws.SYSTEM_PROMPT) : ''))
    : (typeof googlepse.systemPrompt === 'string' ? String(googlepse.systemPrompt) : (typeof ws.SYSTEM_PROMPT === 'string' ? String(ws.SYSTEM_PROMPT) : ''))
  // Provider-specific env defaults
  const envPrompt = provider === 'browserless'
    ? (process.env.BROWSERLESS_SYSTEM_PROMPT || '')
    : (process.env.GOOGLEPSE_SYSTEM_PROMPT || '')
  return {
    ENABLED: enabled,
    SYSTEM_PROMPT: prompt,
    ENV_SYSTEM_PROMPT: envPrompt,
    PROVIDER: provider,
    browserless: {
      apiKey: typeof browserless.apiKey === 'string' ? String(browserless.apiKey) : undefined,
      stealth: browserless.stealth !== false,
      stealthRoute: browserless.stealthRoute === true,
      blockAds: browserless.blockAds === true,
      headless: browserless.headless !== false,
      locale: typeof browserless.locale === 'string' ? String(browserless.locale) : undefined,
      timezone: typeof browserless.timezone === 'string' ? String(browserless.timezone) : undefined,
      userAgent: typeof browserless.userAgent === 'string' ? String(browserless.userAgent) : undefined,
      route: typeof browserless.route === 'string' ? String(browserless.route) : undefined,
      systemPrompt: typeof browserless.systemPrompt === 'string' ? String(browserless.systemPrompt) : undefined,
    },
    googlepse: {
      apiKey: typeof googlepse.apiKey === 'string' ? String(googlepse.apiKey) : undefined,
      engineId: typeof googlepse.engineId === 'string' ? String(googlepse.engineId) : undefined,
      resultCount: Number.isFinite(googlepse.resultCount) ? Number(googlepse.resultCount) : 5,
      domainFilters: Array.isArray(googlepse.domainFilters) ? (googlepse.domainFilters as any[]).filter(v => typeof v === 'string') : [],
      systemPrompt: typeof googlepse.systemPrompt === 'string' ? String(googlepse.systemPrompt) : undefined,
    }
  }
}

export async function updateWebSearchConfigAction(payload: any): Promise<void> {
  const row = await (db as any).config.findUnique({ where: { id: 1 } })
  const current = (row?.data || {}) as any
  // Deep merge to avoid clobbering nested provider configs (e.g., browserless, googlepse)
  const isObj = (v: any) => v && typeof v === 'object' && !Array.isArray(v)
  const deepMerge = (target: any, source: any): any => {
    if (!isObj(target) || !isObj(source)) return source
    const result: any = { ...target }
    for (const key of Object.keys(source)) {
      const tVal = (target as any)[key]
      const sVal = (source as any)[key]
      result[key] = (isObj(tVal) && isObj(sVal)) ? deepMerge(tVal, sVal) : sVal
    }
    return result
  }
  const nextWebsearch = deepMerge(current?.websearch || {}, (payload || {}).websearch || {})
  const next = { ...current, websearch: nextWebsearch }
  if (row) await (db as any).config.update({ where: { id: 1 }, data: { data: next } })
  else await (db as any).config.create({ data: { id: 1, data: next } })
  // Ensure the admin websearch page and any caches pick up the latest config
  revalidatePath('/admin/websearch')
}


