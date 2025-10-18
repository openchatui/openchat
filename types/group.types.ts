import type { GroupPermissions } from '@/lib/modules/access-control/permissions.types'

export interface Group {
  id: string
  name?: string
  description?: string
  userId?: string
  userIds?: string[]
  userCount?: number
  createdAt?: string
  updatedAt?: string
  permissions?: GroupPermissions
}


