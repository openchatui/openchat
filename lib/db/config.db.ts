import db from '@/lib/db'
import type { Prisma } from '@prisma/client'

export interface ModelsConfigShape { models: { order: string[] } }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function ensureModelsConfigShape(data: unknown): ModelsConfigShape {
  const root = isPlainObject(data) ? data : {}
  const models = isPlainObject((root as any).models) ? (root as any).models : {}
  const order = Array.isArray((models as any).order) ? (models as any).order as string[] : []
  return { models: { order } }
}

export async function getOrCreateBaseConfig(): Promise<ModelsConfigShape> {
  let config = await db.config.findUnique({ where: { id: 1 } })
  if (!config) {
    const defaults: ModelsConfigShape = { models: { order: [] } }
    await db.config.create({
      data: { id: 1, data: defaults as unknown as Prisma.InputJsonValue },
    })
    return defaults
  }
  return ensureModelsConfigShape(config.data || {})
}

export async function getAndShapeConfigAndPersistIfNeeded(): Promise<ModelsConfigShape> {
  const config = await db.config.findUnique({ where: { id: 1 } })
  if (!config) {
    return await getOrCreateBaseConfig()
  }
  const current = config.data || {}
  const shaped = ensureModelsConfigShape(current)
  const needsPersist = !isPlainObject((current as any).models)
    || !Array.isArray((current as any).models?.order)
  if (needsPersist) {
    const currentObj: Record<string, unknown> = isPlainObject(current) ? (current as Record<string, unknown>) : {}
    const nextData = { ...currentObj, ...shaped }
    await db.config.update({ where: { id: 1 }, data: { data: nextData as unknown as Prisma.InputJsonValue } })
  }
  return shaped
}

export async function upsertModelsConfig(partial: Partial<ModelsConfigShape>): Promise<ModelsConfigShape> {
  // We only support updating models.order for now
  const incoming = isPlainObject((partial as any)?.models) ? ((partial as any).models as any) : {}
  const updates: { order?: string[] } = {}
  if (Object.prototype.hasOwnProperty.call(incoming, 'order')) {
    if (!Array.isArray(incoming.order)) throw new Error('models.order must be an array')
    updates.order = incoming.order as string[]
  }

  let config = await db.config.findUnique({ where: { id: 1 } })
  if (!config) {
    const nextData: ModelsConfigShape = { models: { order: [], ...updates } }
    await db.config.create({ data: { id: 1, data: nextData as unknown as Prisma.InputJsonValue } })
    return nextData
  }

  const currentData = (config.data || {}) as Record<string, unknown>
  const currentModels = isPlainObject((currentData as any).models) ? (currentData as any).models : {}
  const nextModels = { order: [], ...currentModels, ...updates }
  const nextData = { ...currentData, models: nextModels } as ModelsConfigShape
  await db.config.update({ where: { id: 1 }, data: { data: nextData as unknown as Prisma.InputJsonValue } })
  return { models: nextModels }
}


