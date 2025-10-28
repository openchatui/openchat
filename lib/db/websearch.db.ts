import 'server-only'
import db from '@/lib/db'
import type { Prisma } from '@prisma/client'

export async function getWebsearchConfigData(): Promise<Record<string, unknown>> {
  let config = await db.config.findUnique({ where: { id: 1 } })
  if (!config) {
    config = await db.config.create({ data: { id: 1, data: {} } })
  }
  const data = (config.data || {}) as Record<string, unknown>
  return data
}

export async function updateWebsearchConfigData(nextData: Record<string, unknown>): Promise<Record<string, unknown>> {
  const json: Prisma.InputJsonValue = JSON.parse(JSON.stringify(nextData)) as Prisma.InputJsonValue
  const existing = await db.config.findUnique({ where: { id: 1 } })
  const result = existing
    ? await db.config.update({ where: { id: 1 }, data: { data: json } })
    : await db.config.create({ data: { id: 1, data: json } })
  return (result.data || {}) as Record<string, unknown>
}


