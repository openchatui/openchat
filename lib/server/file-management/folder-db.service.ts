import 'server-only'
import db from '@/lib/db'
import { randomBytes } from 'crypto'
import type { FileEntry } from './files.types'

export class FolderDbService {
  private static generateFolderId(): string {
    const raw = randomBytes(24).toString('base64url') // ~32 url-safe chars
    return raw.slice(0, 24) + '-' + raw.slice(24, 32) // insert dash for readability
  }
  static async getRootFolderId(userId: string): Promise<string> {
    const existing = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "folder"
      WHERE user_id = ${userId}
        AND parent_id IS NULL
        AND LOWER(name) IN ('root', 'my drive')
      LIMIT 1`
    if (existing && existing[0]?.id) {
      // Ensure default system folders (e.g., Trash) exist as well
      await FolderDbService.getTrashFolderId(userId)
      return existing[0].id
    }

    const id = FolderDbService.generateFolderId()
    const nowSec = Math.floor(Date.now() / 1000)
    await db.$executeRaw`INSERT INTO "folder" (id, user_id, parent_id, name, items, meta, is_expanded, created_at, updated_at, data)
      VALUES (${id}, ${userId}, ${null}, ${'My Drive'}, ${JSON.stringify({})}, ${JSON.stringify({})}, ${0}, ${nowSec}, ${nowSec}, ${JSON.stringify({})})`
    // Also create Trash automatically
    await FolderDbService.getTrashFolderId(userId)
    return id
  }
  static async getTrashFolderId(userId: string): Promise<string> {
    const existing = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "folder"
      WHERE user_id = ${userId}
        AND parent_id IS NULL
        AND LOWER(name) IN ('trash', 'bin')
      LIMIT 1`
    if (existing && existing[0]?.id) return existing[0].id

    const id = FolderDbService.generateFolderId()
    const nowSec = Math.floor(Date.now() / 1000)
    await db.$executeRaw`INSERT INTO "folder" (id, user_id, parent_id, name, items, meta, is_expanded, created_at, updated_at, data)
      VALUES (${id}, ${userId}, ${null}, ${'Trash'}, ${JSON.stringify({})}, ${JSON.stringify({ system: 'trash' })}, ${0}, ${nowSec}, ${nowSec}, ${JSON.stringify({})})`
    return id
  }
  static async createFolderRecord(userId: string, name: string, parentId?: string | null): Promise<{ id: string }> {
    const id = FolderDbService.generateFolderId()
    const nowSec = Math.floor(Date.now() / 1000)
    const effectiveParentId = parentId && parentId.length > 0 ? parentId : await FolderDbService.getRootFolderId(userId)
    const client: any = db as any
    if (client?.folder?.create) {
      await client.folder.create({
        data: {
          id,
          userId,
          parentId: effectiveParentId,
          name,
          items: {},
          meta: {},
          isExpanded: false,
          createdAt: nowSec,
          updatedAt: nowSec,
          data: {},
        },
      })
    } else {
      await db.$executeRaw`INSERT INTO "folder" (id, user_id, parent_id, name, items, meta, is_expanded, created_at, updated_at, data)
        VALUES (${id}, ${userId}, ${effectiveParentId}, ${name}, ${JSON.stringify({})}, ${JSON.stringify({})}, ${0}, ${nowSec}, ${nowSec}, ${JSON.stringify({})})`
    }
    return { id }
  }

  static async listRootEntries(userId: string): Promise<FileEntry[]> {
    const nowSec = Math.floor(Date.now() / 1000)
    // Use raw queries with safe downcast from ms->s when needed to avoid Prisma Int overflow
    const folders = await db.$queryRaw<any[]>`
      SELECT id, name,
        CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt
      FROM "folder"
      WHERE user_id = ${userId}
        AND parent_id IS NULL
        AND LOWER(name) NOT IN ('root', 'my drive')
      ORDER BY name ASC
    `

    const files = await db.$queryRaw<any[]>`
      SELECT id, filename, path,
        CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt
      FROM "file"
      WHERE user_id = ${userId} AND (path IS NULL OR path = '')
      ORDER BY filename ASC
    `

    const folderEntries: FileEntry[] = folders.map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.id,
      isDirectory: true,
      size: null,
      modifiedMs: Number(f.updatedAt ?? nowSec) * 1000,
    }))

    const fileEntries: FileEntry[] = files.map((f: any) => ({
      id: f.id,
      name: f.filename,
      path: f.path ? String(f.path).replace(/^\/+/, '') + '/' + f.filename : f.filename,
      isDirectory: false,
      size: null,
      modifiedMs: Number(f.updatedAt ?? nowSec) * 1000,
    }))

    return [...folderEntries, ...fileEntries]
  }

  static async listFoldersByParent(userId: string, parentId?: string | null): Promise<FileEntry[]> {
    const effectiveParentId = parentId && parentId.length > 0
      ? parentId
      : await FolderDbService.getRootFolderId(userId)

    const rows = await db.$queryRaw<any[]>`
      SELECT id, name,
        CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt
      FROM "folder"
      WHERE user_id = ${userId} AND parent_id = ${effectiveParentId}
      ORDER BY name ASC
    `

    const nowSec = Math.floor(Date.now() / 1000)
    return rows.map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.id,
      isDirectory: true,
      size: null,
      modifiedMs: Number(f.updatedAt ?? nowSec) * 1000,
    }))
  }

  static async getFolderNameById(userId: string, folderId: string): Promise<string | null> {
    const rows = await db.$queryRaw<any[]>`
      SELECT name FROM "folder" WHERE user_id = ${userId} AND id = ${folderId} LIMIT 1`
    return rows && rows[0]?.name ? String(rows[0].name) : null
  }

  static async listFilesByParent(userId: string, parentId?: string | null): Promise<FileEntry[]> {
    const effectiveParentId = parentId && parentId.length > 0
      ? parentId
      : await FolderDbService.getRootFolderId(userId)

    const nowSec = Math.floor(Date.now() / 1000)
    const files = await db.$queryRaw<any[]>`
      SELECT id, filename, path,
        CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt
      FROM "file"
      WHERE user_id = ${userId}
        AND parent_id = ${effectiveParentId}
      ORDER BY filename ASC
    `

    const fileEntries: FileEntry[] = files.map((f: any) => {
      const rawPath = (f.path ?? '') as string
      let combined = ''
      if (rawPath) {
        const normalized = rawPath.replace(/^\/+/, '')
        // If path already includes filename, use as-is; otherwise append
        combined = normalized.endsWith('/' + f.filename) || normalized === f.filename
          ? normalized
          : normalized + '/' + f.filename
      } else {
        combined = f.filename
      }
      return {
        id: f.id,
        name: f.filename,
        path: combined,
        isDirectory: false,
        size: null,
        modifiedMs: Number(f.updatedAt ?? nowSec) * 1000,
      }
    })

    return fileEntries
  }

  static async getFolderBreadcrumb(userId: string, folderId?: string | null): Promise<{ id: string; name: string }[]> {
    const effectiveId = folderId && folderId.length > 0 ? folderId : await FolderDbService.getRootFolderId(userId)
    // Walk up parents to root
    const segments: { id: string; name: string; parentId: string | null }[] = []
    let currentId: string | null = effectiveId
    let guard = 0
    while (currentId && guard < 64) {
      type Row = { id: string; name: string; parentId: string | null }
      const rs: any[] = await db.$queryRaw`SELECT id, name, parent_id as parentId FROM "folder" WHERE user_id = ${userId} AND id = ${currentId} LIMIT 1`
      const row: Row | undefined = rs && rs[0]
      if (!row) break
      segments.push({ id: String(row.id), name: String(row.name), parentId: row.parentId ? String(row.parentId) : null })
      currentId = row.parentId ? String(row.parentId) : null
      guard++
    }
    // Also include a synthetic root if none has null parent (safety)
    if (segments.length === 0) {
      const rootId = await FolderDbService.getRootFolderId(userId)
      segments.push({ id: rootId, name: 'root', parentId: null })
    }
    const ordered = segments.reverse()
    if (ordered.length > 0) {
      ordered[0] = { ...ordered[0], name: 'My Drive' }
    }
    return ordered.map(({ id, name }) => ({ id, name }))
  }
}


