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

function filterOpenAI(input: any) {
  const out: any = {}
  if (typeof input.enable === 'boolean') out.enable = input.enable
  if (Array.isArray(input.api_base_urls) && input.api_base_urls.every((v: any) => typeof v === 'string')) {
    out.api_base_urls = input.api_base_urls
  }
  if (Array.isArray(input.api_keys) && input.api_keys.every((v: any) => typeof v === 'string')) {
    out.api_keys = input.api_keys
  }
  if (isPlainObject(input.api_configs)) out.api_configs = input.api_configs
  return out
}

function filterOllama(input: any) {
  const out: any = {}
  if (typeof input.enable === 'boolean') out.enable = input.enable
  if (Array.isArray(input.base_urls) && input.base_urls.every((v: any) => typeof v === 'string')) {
    out.base_urls = input.base_urls
  }
  if (isPlainObject(input.api_configs)) out.api_configs = input.api_configs
  return out
}

function filterDeepgram(input: any) {
  const out: any = {}
  if (typeof input.enable === 'boolean') out.enable = input.enable
  if (Array.isArray(input.api_keys) && input.api_keys.every((v: any) => typeof v === 'string')) {
    out.api_keys = input.api_keys
  }
  if (isPlainObject(input.api_configs)) out.api_configs = input.api_configs
  return out
}

function filterElevenLabs(input: any) {
  const out: any = {}
  if (typeof input.enable === 'boolean') out.enable = input.enable
  if (Array.isArray(input.api_keys) && input.api_keys.every((v: any) => typeof v === 'string')) {
    out.api_keys = input.api_keys
  }
  if (isPlainObject(input.api_configs)) out.api_configs = input.api_configs
  return out
}

// PUT /api/connections/config/update - upsert connections config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const incoming = isPlainObject(body?.connections) ? (body.connections as any) : null
    if (!incoming) {
      return NextResponse.json({ error: 'Missing connections payload' }, { status: 400 })
    }

    const updates: any = {}
    if (isPlainObject(incoming.openai)) updates.openai = filterOpenAI(incoming.openai)
    if (isPlainObject(incoming.ollama)) updates.ollama = filterOllama(incoming.ollama)
    if (isPlainObject(incoming.deepgram)) updates.deepgram = filterDeepgram(incoming.deepgram)
    if (isPlainObject(incoming.elevenlabs)) updates.elevenlabs = filterElevenLabs(incoming.elevenlabs)

    const existing = await (db as any).config.findUnique({ where: { id: 1 } })
    const currentData = (existing?.data || {}) as Record<string, unknown>
    const currentConnections = isPlainObject((currentData as any).connections)
      ? ((currentData as any).connections as any)
      : {}

    const mergedConnections = deepMerge(currentConnections, updates)
    const nextData = { ...currentData, connections: mergedConnections }

    const result = existing
      ? await (db as any).config.update({ where: { id: 1 }, data: { data: nextData } })
      : await (db as any).config.create({ data: { id: 1, data: nextData } })

    return NextResponse.json({ connections: (result.data as any).connections })
  } catch (error) {
    console.error('PUT /api/connections/config/update error:', error)
    return NextResponse.json({ error: 'Failed to update connections config' }, { status: 500 })
  }
}


