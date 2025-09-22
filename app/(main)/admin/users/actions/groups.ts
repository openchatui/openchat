'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth/auth'
import db from '@/lib/db'
import { DEFAULT_GROUP_PERMISSIONS, type GroupPermissions } from '@/types/permissions'

export type ActionResult =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string }

export async function createGroupAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { status: 'error', message: 'Unauthorized' }
    }

    const name = (formData.get('name') || '').toString().trim()
    const description = (formData.get('description') || '').toString().trim()
    const permissionsJson = (formData.get('permissions') || '').toString()
    const userIdsJson = (formData.get('userIds') || '').toString()

    if (!name) {
      return { status: 'error', message: 'Group name is required' }
    }

    let permissions: GroupPermissions = DEFAULT_GROUP_PERMISSIONS
    if (permissionsJson) {
      try {
        const parsed = JSON.parse(permissionsJson)
        permissions = { ...DEFAULT_GROUP_PERMISSIONS, ...parsed }
      } catch {
        return { status: 'error', message: 'Invalid permissions payload' }
      }
    }

    const id = crypto.randomUUID()
    const nowSec = Math.floor(Date.now() / 1000)
    let userIds: string[] = []
    if (userIdsJson) {
      try {
        const parsed = JSON.parse(userIdsJson)
        if (Array.isArray(parsed)) {
          userIds = parsed.filter((v: any) => typeof v === 'string')
        }
      } catch {}
    }

    await (db as any).group.create({
      data: {
        id,
        userId: session.user.id,
        name,
        description,
        permissions,
        userIds,
        createdAt: nowSec,
        updatedAt: nowSec,
      },
    })

    revalidatePath('/admin/users')
    return { status: 'success' }
  } catch (error) {
    return { status: 'error', message: 'Could not create group' }
  }
}

export async function updateGroupAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { status: 'error', message: 'Unauthorized' }
    }

    const id = (formData.get('id') || '').toString().trim()
    const name = (formData.get('name') || '').toString().trim()
    const description = (formData.get('description') || '').toString().trim()
    const permissionsJson = (formData.get('permissions') || '').toString()
    const userIdsJson = (formData.get('userIds') || '').toString()

    if (!id) return { status: 'error', message: 'Missing id' }
    if (!name) return { status: 'error', message: 'Group name is required' }

    let permissions: GroupPermissions = DEFAULT_GROUP_PERMISSIONS
    if (permissionsJson) {
      try {
        const parsed = JSON.parse(permissionsJson)
        permissions = { ...DEFAULT_GROUP_PERMISSIONS, ...parsed }
      } catch {
        return { status: 'error', message: 'Invalid permissions payload' }
      }
    }

    const nowSec = Math.floor(Date.now() / 1000)
    let userIds: string[] | undefined = undefined
    if (userIdsJson) {
      try {
        const parsed = JSON.parse(userIdsJson)
        if (Array.isArray(parsed)) {
          userIds = parsed.filter((v: any) => typeof v === 'string')
        }
      } catch {
        return { status: 'error', message: 'Invalid userIds payload' }
      }
    }

    await (db as any).group.update({
      where: { id },
      data: {
        name,
        description,
        permissions,
        ...(userIds ? { userIds } : {}),
        updatedAt: nowSec,
      },
    })

    // Update model access control based on submitted modelPermissions
    const modelPermissionsJson = (formData.get('modelPermissions') || '').toString()
    if (modelPermissionsJson) {
      try {
        const parsed = JSON.parse(modelPermissionsJson) as Record<string, { read?: boolean; write?: boolean }>
        if (parsed && typeof parsed === 'object') {
          const modelIds = Object.keys(parsed)
          if (modelIds.length > 0) {
            // Load models to ensure they exist and to read current accessControl
            const models = await (db as any).model.findMany({ where: { id: { in: modelIds } } })
            await Promise.all(models.map(async (m: any) => {
              const sel = parsed[m.id] || {}
              const current: any = m.accessControl || { read: { group_ids: [], user_ids: [] }, write: { group_ids: [], user_ids: [] } }
              const next = {
                read: {
                  group_ids: Array.isArray(current.read?.group_ids) ? [...current.read.group_ids] : [],
                  user_ids: Array.isArray(current.read?.user_ids) ? [...current.read.user_ids] : [],
                },
                write: {
                  group_ids: Array.isArray(current.write?.group_ids) ? [...current.write.group_ids] : [],
                  user_ids: Array.isArray(current.write?.user_ids) ? [...current.write.user_ids] : [],
                },
              }

              // Helper to add/remove group id
              const ensureIn = (arr: string[], idToAdd: string) => Array.from(new Set([...arr, idToAdd]))
              const ensureOut = (arr: string[], idToRemove: string) => (arr || []).filter((x) => x !== idToRemove)

              if (sel.read) {
                next.read.group_ids = ensureIn(next.read.group_ids, id)
              } else {
                next.read.group_ids = ensureOut(next.read.group_ids, id)
              }

              if (sel.write) {
                next.write.group_ids = ensureIn(next.write.group_ids, id)
              } else {
                next.write.group_ids = ensureOut(next.write.group_ids, id)
              }

              // Only update if changed
              const changed = JSON.stringify(current) !== JSON.stringify(next)
              if (changed) {
                await (db as any).model.update({ where: { id: m.id }, data: { accessControl: next } })
              }
            }))
          }
        }
      } catch (e) {
        // ignore modelPermissions parsing errors
      }
    }

    revalidatePath('/admin/users')
    return { status: 'success' }
  } catch (error) {
    return { status: 'error', message: 'Could not update group' }
  }
}

export async function updateUserGroupsAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { status: 'error', message: 'Unauthorized' }
    }

    const userId = (formData.get('userId') || '').toString().trim()
    const groupIdsJson = (formData.get('groupIds') || '').toString()

    if (!userId) return { status: 'error', message: 'Missing userId' }

    let selectedGroupIds: string[] = []
    if (groupIdsJson) {
      try {
        const parsed = JSON.parse(groupIdsJson)
        if (Array.isArray(parsed)) {
          selectedGroupIds = parsed.filter((v: any) => typeof v === 'string')
        }
      } catch {
        return { status: 'error', message: 'Invalid groupIds payload' }
      }
    }

    const groups = await (db as any).group.findMany()
    await Promise.all((groups || []).map(async (g: any) => {
      const raw = Array.isArray(g.userIds)
        ? g.userIds
        : Array.isArray(g.user_ids)
          ? g.user_ids
          : typeof g.userIds === 'object' && g.userIds !== null && 'set' in g.userIds
            ? (g.userIds.set as string[])
            : []
      const current: string[] = Array.isArray(raw) ? raw.filter((v: any) => typeof v === 'string') : []
      const shouldHave = selectedGroupIds.includes(g.id)
      const hasNow = current.includes(userId)
      let next = current
      if (shouldHave && !hasNow) next = Array.from(new Set([...current, userId]))
      if (!shouldHave && hasNow) next = current.filter((id) => id !== userId)
      const changed = next.length !== current.length || next.some((v, i) => v !== current[i])
      if (changed) {
        await (db as any).group.update({ where: { id: g.id }, data: { userIds: next } })
      }
    }))

    revalidatePath('/admin/users')
    return { status: 'success' }
  } catch (error) {
    return { status: 'error', message: 'Could not update user groups' }
  }
}


