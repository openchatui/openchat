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


