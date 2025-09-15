import crypto from 'crypto'
import db from '@/lib/db'

const API_KEY_PREFIX = 'sk-'

export function generateApiKey(): string {
  const random = crypto.randomBytes(16).toString('hex')
  return `${API_KEY_PREFIX}${random}`
}

export function hashApiKey(plainKey: string): string {
  return crypto.createHash('sha256').update(plainKey).digest('hex')
}

export async function createApiKey(userId: string, keyName: string) {
  const plainKey = generateApiKey()
  const hashed = hashApiKey(plainKey)

  const record = await db.apiKey.create({
    data: {
      userId,
      keyName,
      key: hashed,
    },
    select: {
      id: true,
      keyName: true,
      createdAt: true,
    },
  })

  return { ...record, key: plainKey }
}

export async function revokeApiKey(userId: string, id: string) {
  const key = await db.apiKey.findFirst({ where: { id, userId } })
  if (!key) return false
  await db.apiKey.delete({ where: { id } })
  return true
}

export async function listApiKeys(userId: string) {
  return db.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      keyName: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export function extractApiKeyFromHeaders(headers: Headers): string | null {
  const auth = headers.get('authorization') || headers.get('Authorization')
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  const headerKey = headers.get('x-api-key') || headers.get('X-API-Key')
  if (headerKey) return headerKey.trim()
  return null
}

export async function resolveUserIdFromApiKey(plainKey: string): Promise<string | null> {
  if (!plainKey.startsWith(API_KEY_PREFIX) || plainKey.length !== API_KEY_PREFIX.length + 32) {
    return null
  }
  const hashed = hashApiKey(plainKey)
  const entry = await db.apiKey.findFirst({ select: { userId: true }, where: { key: hashed } })
  return entry?.userId ?? null
}


