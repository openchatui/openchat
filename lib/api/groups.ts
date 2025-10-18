import type { GroupPermissions } from '@/lib/modules/access-control/permissions.types'
import { absoluteUrl, httpFetch } from './http'

export type CreateGroupInput = {
  name: string
  description?: string
  permissions?: GroupPermissions
}

export async function createGroup(input: CreateGroupInput): Promise<{ id: string }> {
  const res = await httpFetch(absoluteUrl('/api/v1/groups'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to create group')
  }
  const data = await res.json().catch(() => ({}))
  return { id: String(data?.id || '') }
}

export type UpdateGroupInput = {
  id: string
  name: string
  description?: string
  permissions?: GroupPermissions
  userIds?: string[]
}

export async function updateGroup(input: UpdateGroupInput): Promise<void> {
  const { id, ...body } = input
  const res = await httpFetch(absoluteUrl(`/api/v1/groups/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to update group')
  }
}

export async function listGroups(): Promise<any[]> {
  const res = await httpFetch(absoluteUrl('/api/v1/groups'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to fetch groups')
  }
  return await res.json()
}

export async function updateModelAccess(input: { groupId: string; selection: Record<string, { read: boolean; write: boolean }> }): Promise<void> {
  const res = await httpFetch(absoluteUrl('/api/v1/models/access'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId: input.groupId, selection: input.selection })
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to update model access')
  }
}


