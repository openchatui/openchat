import 'server-only'
import db from '@/lib/db'
import { getEffectivePermissionsForUser } from '@/lib/modules/access-control/permissions.service'
import { filterModelsReadableByUser } from '@/lib/modules/access-control/model-access.service'
import type { Model, ModelMeta } from '@/types/model.types'
import type { Prisma } from '@prisma/client'

export type AccessIdList = ReadonlyArray<string>
export interface AccessList { readonly group_ids: AccessIdList; readonly user_ids: AccessIdList }
export interface AccessControl { readonly read: AccessList; readonly write: AccessList }

export interface ModelAccessRow { id: string; accessControl: AccessControl | null }

export async function findModelById(id: string) {
  return await db.model.findFirst({ where: { id }, select: { id: true, name: true, meta: true, userId: true, params: true } })
}

export async function findModelByNameForUser(userId: string, name: string) {
  return await db.model.findFirst({ where: { userId, name }, select: { id: true, name: true, meta: true, params: true } })
}

export async function getLatestParamsForUser(userId: string, where: Array<{ id?: string; name?: string }>) {
  const filters = where.filter(Boolean)
  if (filters.length === 0) return null
  const row = await db.model.findFirst({ where: { userId, OR: filters as any }, select: { params: true, meta: true }, orderBy: { updatedAt: 'desc' } })
  return row
}

export async function listModelsReadableByUser(userId: string): Promise<Model[]> {
  const eff = await getEffectivePermissionsForUser(userId)
  if (!eff.workspace.models) return []
  const modelsRaw = await db.model.findMany({ orderBy: { updatedAt: 'desc' } })
  return await filterModelsReadableByUser(userId, modelsRaw)
}

export async function listActiveModelsLightReadableByUser(userId: string): Promise<Model[]> {
  const eff = await getEffectivePermissionsForUser(userId)
  if (!eff.workspace.models) return []
  const modelsRaw = await db.model.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
    // Include minimal fields required by client Model schema
    select: {
      id: true,
      name: true,
      isActive: true,
      meta: true,
      userId: true,
      accessControl: true,
      // Required by zod schema/types on the client
      baseModelId: true,
      createdAt: true,
      updatedAt: true,
      params: true,
      // Optional on the client but include when cheap to fetch
      providerId: true,
      provider: true,
    } as any,
  })
  const models = await filterModelsReadableByUser(userId, modelsRaw as any)
  return models.map((m: any) => ({ ...m, meta: (m.meta as unknown) as ModelMeta })) as Model[]
}

export async function updateModelForUser(userId: string, modelId: string, data: Partial<Pick<Model, 'name' | 'isActive' | 'meta' | 'params'>>): Promise<Model> {
  const existingModel = await db.model.findFirst({ where: { id: modelId, userId } })
  if (!existingModel) throw new Error('Model not found')
  const merged: any = {}
  if (typeof (data as any).name !== 'undefined') merged.name = (data as any).name
  if (typeof (data as any).isActive !== 'undefined') merged.isActive = (data as any).isActive
  if (Object.prototype.hasOwnProperty.call(data, 'meta')) {
    const currentMeta = (existingModel as any).meta || {}
    const incomingMeta = (data as any).meta || {}
    merged.meta = { ...currentMeta, ...incomingMeta }
  }
  if (Object.prototype.hasOwnProperty.call(data, 'params')) merged.params = (data as any).params
  merged.updatedAt = Math.floor(Date.now() / 1000)
  const updated = await db.model.update({ where: { id: modelId }, data: merged })
  return { ...(updated as any), meta: (updated.meta as unknown) as ModelMeta } as Model
}

export async function batchUpdateModelsVisibilityForUser(userId: string, updates: { id: string; hidden: boolean }[]): Promise<Model[]> {
  const results: Model[] = []
  for (const { id, hidden } of updates) {
    const existing = await db.model.findFirst({ where: { id, userId } })
    if (!existing) throw new Error(`Model ${id} not found`)
    const updatedMeta = { ...(((existing as any).meta) || {}), hidden } as ModelMeta
    const updated = await db.model.update({ where: { id }, data: { meta: updatedMeta as any, isActive: hidden ? false : existing.isActive } })
    results.push({ ...(updated as any), meta: updatedMeta } as Model)
  }
  return results
}

export async function getModelOwnedByUser(userId: string, id: string) {
  return await db.model.findFirst({ where: { id, userId } })
}

export async function findModelsByIds(ids: ReadonlyArray<string>): Promise<ModelAccessRow[]> {
  if (ids.length === 0) return []
  const rows = await db.model.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, accessControl: true },
  })
  return rows as unknown as ModelAccessRow[]
}

export async function updateModelAccessControl(modelId: string, access: AccessControl): Promise<void> {
  await db.model.update({ where: { id: modelId }, data: { accessControl: (access as unknown) as Prisma.InputJsonValue } })
}

export interface UpsertModelData {
  readonly name: string
  readonly meta: unknown
  readonly params: unknown
  readonly providerId: string
  readonly provider: string
  readonly isActive: boolean
  readonly createdAt: number
  readonly updatedAt: number
}

export async function upsertModelForUser(userId: string, id: string, data: UpsertModelData) {
  const updated = await db.model.upsert({
    where: { id },
    update: {
      name: data.name,
      meta: data.meta as any,
      params: data.params as any,
      updatedAt: data.updatedAt,
      isActive: data.isActive,
      providerId: data.providerId,
      provider: data.provider,
      userId,
    },
    create: {
      id,
      userId,
      providerId: data.providerId,
      provider: data.provider,
      name: data.name,
      meta: data.meta as any,
      params: data.params as any,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isActive: data.isActive,
    },
  })
  return updated
}


