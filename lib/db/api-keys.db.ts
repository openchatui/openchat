import 'server-only'
import db from '@/lib/db'

export async function createApiKey(userId: string, keyName: string, hashedKey: string) {
  return await db.apiKey.create({
    data: { userId, keyName, key: hashedKey },
    select: { id: true, keyName: true, createdAt: true },
  })
}

export async function findApiKeyByHash(hashedKey: string) {
  return await db.apiKey.findFirst({ where: { key: hashedKey }, select: { id: true, userId: true } })
}

export async function deleteApiKey(userId: string, keyId: string) {
  const key = await db.apiKey.findFirst({ where: { id: keyId, userId }, select: { id: true } })
  if (!key) return false
  await db.apiKey.delete({ where: { id: keyId } })
  return true
}

export async function listApiKeys(userId: string) {
  const keys = await db.apiKey.findMany({
    where: { userId },
    select: { id: true, keyName: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return keys.map(k => ({
    id: k.id,
    keyName: k.keyName,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  }))
}

export async function countApiKeys(userId: string) {
  return await db.apiKey.count({ where: { userId } })
}


