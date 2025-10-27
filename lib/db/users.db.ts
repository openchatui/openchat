import 'server-only'
import db from '@/lib/db'
import type { Prisma } from '@prisma/client'

export interface CreateUserInput {
  email: string
  username: string
  hashedPassword: string
  role?: 'ADMIN' | 'USER'
}

export async function findUserByEmail(email: string) {
  return await db.user.findUnique({ where: { email: email.toLowerCase() } })
}

export async function findUserById(id: string) {
  return await db.user.findUnique({ where: { id } })
}

export async function findUserByUsername(username: string) {
  return await db.user.findFirst({ where: { name: username } })
}

export async function createUser(input: CreateUserInput) {
  return await db.user.create({
    data: {
      email: input.email.toLowerCase(),
      name: input.username,
      hashedPassword: input.hashedPassword,
      role: input.role || 'USER',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  })
}

export async function updateUserImage(userId: string, imageUrl: string) {
  await db.user.update({ where: { id: userId }, data: { image: imageUrl } })
}

export async function updateUserRole(userId: string, role: 'ADMIN' | 'USER') {
  await db.user.update({ where: { id: userId }, data: { role } })
}

export async function getUserCount() {
  return await db.user.count()
}

export async function getUserSettingsFromDb(userId: string): Promise<Record<string, unknown>> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { settings: true } })
  return (user?.settings || {}) as Record<string, unknown>
}

export async function updateUserSettingsInDb(userId: string, settings: Record<string, unknown>): Promise<{ settings: Record<string, unknown>; updatedAt: string }> {
  const updated = await db.user.update({ where: { id: userId }, data: { settings: settings as unknown as Prisma.InputJsonValue }, select: { settings: true, updatedAt: true } })
  return { settings: (updated.settings || {}) as Record<string, unknown>, updatedAt: updated.updatedAt.toISOString() }
}


// ----- Admin-oriented helpers reused by API routes -----

export async function listUsersForAdmin() {
  return await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      accounts: { select: { providerAccountId: true, provider: true } },
      sessions: { select: { expires: true }, orderBy: { expires: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createUserAdmin(input: { name: string; email: string; hashedPassword?: string; role: 'USER'|'ADMIN' }) {
  return await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      hashedPassword: input.hashedPassword || '',
      role: input.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      accounts: { select: { providerAccountId: true } },
    },
  })
}

export async function createUserWithIdAdmin(input: { id: string; name: string; email: string; hashedPassword?: string; role: 'USER'|'ADMIN' }) {
  return await db.user.create({
    data: {
      id: input.id,
      name: input.name,
      email: input.email,
      hashedPassword: input.hashedPassword || '',
      role: input.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function findUserWithDetailsById(id: string) {
  return await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      accounts: { select: { providerAccountId: true, provider: true } },
      sessions: { select: { expires: true }, orderBy: { expires: 'desc' }, take: 1 },
    },
  })
}

export async function updateUserBasic(id: string, update: { name: string; email: string; role: 'USER'|'ADMIN'; hashedPassword?: string }) {
  const data: Record<string, unknown> = { name: update.name, email: update.email, role: update.role }
  if (update.hashedPassword) data.hashedPassword = update.hashedPassword
  await db.user.update({ where: { id }, data: data as Prisma.UserUpdateInput })
}

export async function deleteUserById(id: string) {
  await db.user.delete({ where: { id } })
}

export async function getBasicUserById(userId: string) {
  return await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } })
}

// Pinned models helpers
export async function getPinnedModels(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { settings: true } })
  const settings = (user?.settings || {}) as Record<string, unknown>
  const ui = (settings.ui && typeof settings.ui === 'object' && !Array.isArray(settings.ui)) ? (settings.ui as Record<string, unknown>) : {}
  const pinnedRaw = (ui as Record<string, unknown>)['pinned_models']
  const pinned = Array.isArray(pinnedRaw) ? pinnedRaw.filter((v): v is string => typeof v === 'string') : []
  return pinned
}

export async function setPinnedModels(userId: string, modelIds: string[]): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { settings: true } })
  const settings = (user?.settings || {}) as Record<string, unknown>
  const ui = (settings.ui && typeof settings.ui === 'object' && !Array.isArray(settings.ui)) ? (settings.ui as Record<string, unknown>) : {}
  const next = {
    ...settings,
    ui: {
      ...ui,
      pinned_models: Array.from(new Set(modelIds)),
    },
  }
  await db.user.update({ where: { id: userId }, data: { settings: next as unknown as Prisma.InputJsonValue } })
}

// Groups helpers
export async function updateUserGroups(userId: string, groupIds: string[]): Promise<void> {
  const selectedIds = Array.from(new Set(groupIds))
  const groups = await db.group.findMany({ select: { id: true, userIds: true } })
  await Promise.all(groups.map(async (g) => {
    const currentRaw = g.userIds
    const current: string[] = Array.isArray(currentRaw) ? currentRaw.filter((v): v is string => typeof v === 'string') : []
    const shouldHave = selectedIds.includes(g.id)
    const hasNow = current.includes(userId)
    let next = current
    if (shouldHave && !hasNow) next = Array.from(new Set([...current, userId]))
    if (!shouldHave && hasNow) next = current.filter((x) => x !== userId)
    const changed = next.length !== current.length || next.some((v, i) => v !== current[i])
    if (changed) {
      await db.group.update({ where: { id: g.id }, data: { userIds: next } })
    }
  }))
}


