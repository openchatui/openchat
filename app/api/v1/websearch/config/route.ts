import { NextResponse } from 'next/server'
import db from '@/lib/db'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// GET /api/v1/websearch/config - returns websearch config
export async function GET() {
  try {
    let config = await (db as any).config.findUnique({ where: { id: 1 } })
    if (!config) {
      config = await (db as any).config.create({ data: { id: 1, data: {} } })
    }

    const data = (config.data || {}) as any
    const websearch = isPlainObject(data.websearch) ? (data.websearch as any) : {}
    const ENABLED = Boolean(websearch.ENABLED)
    const ENABLED_BY_DEFAULT = Boolean(websearch.ENABLED_BY_DEFAULT)
    const SYSTEM_PROMPT = typeof websearch.SYSTEM_PROMPT === 'string' ? websearch.SYSTEM_PROMPT : null
    const PROVIDER = typeof websearch.PROVIDER === 'string' && ['browserless', 'googlepse'].includes(String(websearch.PROVIDER).toLowerCase())
      ? String(websearch.PROVIDER).toLowerCase()
      : 'browserless'
    const GP = isPlainObject(websearch.googlepse) ? (websearch.googlepse as any) : {}
    const GOOGLE_PSE = {
      apiKey: typeof GP.apiKey === 'string' ? GP.apiKey : '',
      engineId: typeof GP.engineId === 'string' ? GP.engineId : '',
      resultCount: Number.isFinite(GP.resultCount) ? Math.max(1, Math.min(50, Number(GP.resultCount))) : 5,
      domainFilters: Array.isArray(GP.domainFilters) ? GP.domainFilters.filter((v: any) => typeof v === 'string' && v.trim().length > 0) : [],
    }
    const BL = isPlainObject(websearch.browserless) ? (websearch.browserless as any) : {}
    const BROWSERLESS = {
      apiKey: typeof BL.apiKey === 'string' ? BL.apiKey : '',
      ENV_API_KEY: typeof process.env.BROWSERLESS_API_KEY === 'string' ? process.env.BROWSERLESS_API_KEY : null,
    }
    const ENV_SYSTEM_PROMPT = typeof process.env.BROWSERLESS_SYSTEM_PROMPT === 'string' ? process.env.BROWSERLESS_SYSTEM_PROMPT : null

    return NextResponse.json({
      websearch: {
        ENABLED,
        ENABLED_BY_DEFAULT,
        SYSTEM_PROMPT,
        PROVIDER,
        googlepse: GOOGLE_PSE,
        browserless: BROWSERLESS,
        ENV_SYSTEM_PROMPT,
      },
    })
  } catch (error) {
    console.error('GET /api/v1/websearch/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch websearch config' }, { status: 500 })
  }
}



