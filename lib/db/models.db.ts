import 'server-only'
import db from '@/lib/db/client.db'

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


