import 'server-only'

import db from '@/lib/db'
import type { Group } from '@/types/group'

export async function getAdminGroups(): Promise<Group[]> {
  const dbGroups = await (db as any).group.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const groups: Group[] = (dbGroups || []).map((g: any) => {
    const userIds: string[] = Array.isArray(g.userIds)
      ? g.userIds
      : Array.isArray(g.user_ids)
        ? g.user_ids
        : typeof g.userIds === 'object' && g.userIds !== null && 'set' in g.userIds
          ? (g.userIds.set as string[])
          : []

    return {
      id: g.id,
      name: g.name ?? undefined,
      description: g.description ?? undefined,
      userId: g.userId ?? g.user_id ?? undefined,
      userIds,
      userCount: Array.isArray(userIds) ? userIds.length : 0,
      createdAt: g.createdAt ? new Date((Number(g.createdAt) || 0) * 1000).toISOString() : undefined,
      updatedAt: g.updatedAt ? new Date((Number(g.updatedAt) || 0) * 1000).toISOString() : undefined,
      permissions: g.permissions ?? undefined,
    }
  })

  return groups
}


