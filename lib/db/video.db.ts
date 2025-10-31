import db from '@/lib/db'
import type { Prisma } from '@prisma/client'

export async function getVideoConfigData(): Promise<Record<string, unknown>> {
  let config = await db.config.findUnique({ where: { id: 1 } })
  if (!config) {
    config = await db.config.create({ data: { id: 1, data: {} } })
  }
  return (config.data || {}) as Record<string, unknown>
}

export async function updateVideoConfigData(nextData: Record<string, unknown>): Promise<Record<string, unknown>> {
  const json: Prisma.InputJsonValue = JSON.parse(JSON.stringify(nextData)) as Prisma.InputJsonValue
  const existing = await db.config.findUnique({ where: { id: 1 } })
  const result = existing
    ? await db.config.update({ where: { id: 1 }, data: { data: json } })
    : await db.config.create({ data: { id: 1, data: json } })
  return (result.data || {}) as Record<string, unknown>
}

export interface CreateUserFileInput {
  id: string
  userId: string
  parentId: string
  filename: string
  dbPath: string
  createdAt: number
  updatedAt: number
  hash?: string | null
  meta?: Record<string, unknown>
  data?: unknown
}

export async function createUserFileRecord(input: CreateUserFileInput): Promise<void> {
  const metaJson: Prisma.InputJsonValue | undefined = input.meta !== undefined
    ? (JSON.parse(JSON.stringify(input.meta)) as Prisma.InputJsonValue)
    : undefined
  const dataJson: Prisma.InputJsonValue | undefined = input.data !== undefined
    ? (JSON.parse(JSON.stringify(input.data)) as Prisma.InputJsonValue)
    : undefined

  await db.file.create({
    data: {
      id: input.id,
      userId: input.userId,
      parentId: input.parentId,
      filename: input.filename,
      meta: metaJson,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      hash: input.hash ?? null,
      data: dataJson,
      path: input.dbPath,
    },
  })
}

