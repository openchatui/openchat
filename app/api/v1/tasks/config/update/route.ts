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

// PUT /api/v1/tasks/config/update - upsert tasks config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const incomingTasks = (body?.tasks ?? {}) as Record<string, unknown>

    if (!isPlainObject(incomingTasks)) {
      return NextResponse.json({ error: 'Invalid tasks payload' }, { status: 400 })
    }

    // Normalize accepted keys
    const acceptedKeys = ['TASK_MODEL', 'TITLE_PROMPT', 'TAGS_PROMPT'] as const
    const filtered: Record<string, unknown> = {}
    for (const key of acceptedKeys) {
      if (key in incomingTasks) filtered[key] = (incomingTasks as any)[key]
    }

    const existing = await (db as any).config.findUnique({ where: { id: 1 } })
    const currentData = (existing?.data || {}) as Record<string, unknown>
    const currentTasks = isPlainObject((currentData as any).tasks) ? (currentData as any).tasks : {}

    // Merge only the tasks key while preserving other top-level keys in data
    const mergedTasks = deepMerge(currentTasks, filtered)
    const nextData = { ...currentData, tasks: mergedTasks }

    const result = existing
      ? await (db as any).config.update({ where: { id: 1 }, data: { data: nextData } })
      : await (db as any).config.create({ data: { id: 1, data: nextData } })

    const data = result.data as any
    const tasks = isPlainObject(data.tasks) ? (data.tasks as any) : {}
    return NextResponse.json({
      tasks: {
        TASK_MODEL: tasks.TASK_MODEL ?? null,
        TITLE_PROMPT: tasks.TITLE_PROMPT ?? null,
        TAGS_PROMPT: tasks.TAGS_PROMPT ?? null,
      },
    })
  } catch (error) {
    console.error('PUT /api/v1/tasks/config/update error:', error)
    return NextResponse.json({ error: 'Failed to update tasks config' }, { status: 500 })
  }
}


