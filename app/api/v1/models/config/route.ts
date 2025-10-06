import { NextResponse } from 'next/server'
import db from '@/lib/db'
import type { Prisma } from '@prisma/client'

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
    let config = await db.config.findUnique({ where: { id: 1 } })
    if (!config) {
      // Create base config with default models config (order only)
      const defaults = { models: { order: [] } }
      config = await db.config.create({ data: { id: 1, data: defaults as unknown as Prisma.InputJsonValue } })
      return NextResponse.json(defaults)
    }

    const current = config.data || {}
    const shaped = ensureModelsConfigShape(current)

    // If models key was missing or malformed, persist the shaped version (order only)
    const needsPersist = !isPlainObject((current as any).models)
      || !Array.isArray((current as any).models?.order)

    if (needsPersist) {
      const currentObj: Record<string, unknown> = isPlainObject(current) ? (current as Record<string, unknown>) : {}
      const nextData = { ...currentObj, ...shaped }
      await db.config.update({ where: { id: 1 }, data: { data: nextData as unknown as Prisma.InputJsonValue } })
    }

    return NextResponse.json(shaped)
  } catch (error) {
    console.error('GET /api/v1/models/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch models config' }, { status: 500 })
  }
}


