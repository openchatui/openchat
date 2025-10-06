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

// PUT /api/v1/models/config/update - upsert models config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const incoming = isPlainObject(body?.models) ? (body.models as any) : {}

    const updates: any = {}
    if (incoming.order !== undefined) {
      if (!Array.isArray(incoming.order)) {
        return NextResponse.json({ error: 'models.order must be an array' }, { status: 400 })
      }
      updates.order = incoming.order
    }

    let config = await db.config.findUnique({ where: { id: 1 } })
    if (!config) {
      const nextData = { models: { order: [], ...updates } }
      config = await db.config.create({ data: { id: 1, data: nextData } })
      return NextResponse.json(nextData)
    }

    const currentData = (config.data || {}) as Record<string, unknown>
    const currentModels = isPlainObject((currentData as any).models) ? (currentData as any).models : {}
    const mergedModels = deepMerge(currentModels, updates)
    const nextData = { ...currentData, models: { order: [], ...mergedModels } }

    const result = await db.config.update({ where: { id: 1 }, data: { data: nextData } })
    return NextResponse.json({ models: nextData.models })
  } catch (error) {
    console.error('PUT /api/v1/models/config/update error:', error)
    return NextResponse.json({ error: 'Failed to update models config' }, { status: 500 })
  }
}


