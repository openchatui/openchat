import 'server-only'
import db from '@/lib/db/client'

export async function listGroups() {
  return await db.group.findMany()
}

export async function getUserGroupIds(userId: string): Promise<string[]> {
  const groups = await db.group.findMany()
  const ids: string[] = []
  for (const g of groups || []) {
    const raw = Array.isArray((g as any).userIds)
      ? (g as any).userIds
      : Array.isArray((g as any)['user_ids'])
        ? (g as any)['user_ids']
        : typeof (g as any).userIds === 'object' && (g as any).userIds !== null && 'set' in (g as any).userIds
          ? ((g as any).userIds.set as string[])
          : []
    const memberIds: string[] = Array.isArray(raw) ? raw.filter((v: any) => typeof v === 'string') : []
    if (memberIds.includes(userId)) ids.push(String((g as any).id))
  }
  return ids
}


