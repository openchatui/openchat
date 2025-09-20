import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge(target: any, source: any): any {
  if (Array.isArray(target) && Array.isArray(source)) return source
  if (isPlainObject(target) && isPlainObject(source)) {
    const result: Record<string, unknown> = { ...target }
    for (const key of Object.keys(source)) {
      const sVal = (source as any)[key]
      const tVal = (target as any)[key]
      result[key] = isPlainObject(tVal) && isPlainObject(sVal) ? deepMerge(tVal, sVal) : sVal
    }
    return result
  }
  return source
}

// PUT /api/v1/websearch/config/update - upsert websearch config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const incoming = (body?.websearch ?? {}) as Record<string, unknown>

    if (!isPlainObject(incoming)) {
      return NextResponse.json({ error: 'Invalid websearch payload' }, { status: 400 })
    }

    // Normalize accepted keys
    const acceptedKeys = ['ENABLED', 'ENABLED_BY_DEFAULT', 'SYSTEM_PROMPT', 'PROVIDER', 'googlepse', 'browserless'] as const
    const filtered: Record<string, unknown> = {}
    for (const key of acceptedKeys) {
      if (key in incoming) filtered[key] = (incoming as any)[key]
    }

    const existing = await (db as any).config.findUnique({ where: { id: 1 } })
    const currentData = (existing?.data || {}) as Record<string, unknown>
    const currentWebSearch = isPlainObject((currentData as any).websearch) ? (currentData as any).websearch : {}

    // Merge only the websearch key while preserving other top-level keys in data
    const mergedWebSearch = deepMerge(currentWebSearch, filtered)
    const nextData = { ...currentData, websearch: mergedWebSearch }

    const result = existing
      ? await (db as any).config.update({ where: { id: 1 }, data: { data: nextData } })
      : await (db as any).config.create({ data: { id: 1, data: nextData } })

    const data = result.data as any
    const websearch = isPlainObject(data.websearch) ? (data.websearch as any) : {}
    return NextResponse.json({
      websearch: {
        ENABLED_BY_DEFAULT: Boolean(websearch.ENABLED_BY_DEFAULT),
        SYSTEM_PROMPT: typeof websearch.SYSTEM_PROMPT === 'string' ? websearch.SYSTEM_PROMPT : null,
      },
    })
  } catch (error) {
    console.error('PUT /api/v1/websearch/config/update error:', error)
    return NextResponse.json({ error: 'Failed to update websearch config' }, { status: 500 })
  }
}



