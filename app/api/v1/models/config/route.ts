import { NextResponse } from 'next/server'
import db from '@/lib/db'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ensureModelsConfigShape(data: any): { models: { order: string[] } } {
  const models = isPlainObject(data?.models) ? (data.models as any) : {}
  const order = Array.isArray(models.order) ? models.order : []
  return { models: { order } }
}

// GET /api/v1/models/config - returns models config, initializing if needed
export async function GET() {
  try {
    let config = await (db as any).config.findUnique({ where: { id: 1 } })
    if (!config) {
      // Create base config with default models config (order only)
      const defaults = { models: { order: [] } }
      config = await (db as any).config.create({ data: { id: 1, data: defaults } })
      return NextResponse.json(defaults)
    }

    const current = config.data || {}
    const shaped = ensureModelsConfigShape(current)

    // If models key was missing or malformed, persist the shaped version (order only)
    const needsPersist = !isPlainObject((current as any).models)
      || !Array.isArray((current as any).models?.order)

    if (needsPersist) {
      const nextData = { ...current, ...shaped }
      await (db as any).config.update({ where: { id: 1 }, data: { data: nextData } })
    }

    return NextResponse.json(shaped)
  } catch (error) {
    console.error('GET /api/v1/models/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch models config' }, { status: 500 })
  }
}


