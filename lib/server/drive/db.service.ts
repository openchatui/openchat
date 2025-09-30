import 'server-only'
import db from '@/lib/db'
import type { FileEntry } from '@/lib/server/drive/types'

export class DriveDbService {
  private static async isGoogleIntegrated(userId: string): Promise<boolean> {
    const account = await db.account.findFirst({ where: { userId, provider: 'google-drive' } })
    return !!account
  }

  static async getRootFolderId(userId: string): Promise<string> {
    // Prefer local provider My Drive
    let existing: { id: string }[] = []
    try {
      existing = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM "folder"
        WHERE user_id = ${userId}
          AND parent_id IS NULL
          AND LOWER(name) = ('my drive')
          AND (json_extract(meta, '$.provider') IS NULL OR json_extract(meta, '$.provider') <> 'google-drive')
        LIMIT 1`
    } catch {
      existing = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM "folder"
        WHERE user_id = ${userId}
          AND parent_id IS NULL
          AND LOWER(name) = ('my drive')
          AND ((meta ->> 'provider') IS NULL OR (meta ->> 'provider') <> 'google-drive')
        LIMIT 1`
    }
    if (existing && existing[0]?.id) {
      await DriveDbService.getTrashFolderId(userId)
      return existing[0].id
    }

    const id = await (async () => {
      // generateFolderId replacement: use random blob from database or crypto
      const { randomBytes } = await import('crypto')
      const raw = randomBytes(24).toString('base64url')
      return raw.slice(0, 24) + '-' + raw.slice(24, 32)
    })()
    const nowSec = Math.floor(Date.now() / 1000)
    await db.$executeRaw`INSERT INTO "folder" (id, user_id, parent_id, name, items, meta, is_expanded, created_at, updated_at, data)
      VALUES (${id}, ${userId}, ${null}, ${'My Drive'}, ${JSON.stringify({})}, ${JSON.stringify({ provider: 'local' })}, ${0}, ${nowSec}, ${nowSec}, ${JSON.stringify({})})`
    // Also create Trash automatically
    await DriveDbService.getTrashFolderId(userId)
    return id
  }

  private static async getGoogleRootFolderId(userId: string): Promise<string | null> {
    try {
      const rs = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM "folder"
        WHERE user_id = ${userId}
          AND parent_id IS NULL
          AND LOWER(name) = ('my drive')
          AND COALESCE(CAST(json_extract(meta, '$.provider') AS TEXT), '') = 'google-drive'
        LIMIT 1`
      return rs && rs[0]?.id ? String(rs[0].id) : null
    } catch {
      const rs = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM "folder"
        WHERE user_id = ${userId}
          AND parent_id IS NULL
          AND LOWER(name) = ('my drive')
          AND COALESCE((meta ->> 'provider')::text, '') = 'google-drive'
        LIMIT 1`
      return rs && rs[0]?.id ? String(rs[0].id) : null
    }
  }

  static async getTrashFolderId(userId: string): Promise<string> {
    // Prefer Google Trash if integrated
    const isGoogle = await DriveDbService.isGoogleIntegrated(userId)
    if (isGoogle) {
      try {
        const rs = await db.$queryRaw<{ id: string }[]>`
          SELECT id FROM "folder"
          WHERE user_id = ${userId}
            AND parent_id IS NULL
            AND LOWER(name) IN ('trash', 'bin')
            AND COALESCE(CAST(json_extract(meta, '$.provider') AS TEXT), '') = 'google-drive'
          LIMIT 1`
        if (rs && rs[0]?.id) return rs[0].id
      } catch {
        const rs = await db.$queryRaw<{ id: string }[]>`
          SELECT id FROM "folder"
          WHERE user_id = ${userId}
            AND parent_id IS NULL
            AND LOWER(name) IN ('trash', 'bin')
            AND COALESCE((meta ->> 'provider')::text, '') = 'google-drive'
          LIMIT 1`
        if (rs && rs[0]?.id) return rs[0].id
      }
    }

    // Fallback to local Trash
    let existing: { id: string }[] = []
    try {
      existing = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM "folder"
        WHERE user_id = ${userId}
          AND parent_id IS NULL
          AND LOWER(name) IN ('trash', 'bin')
          AND (json_extract(meta, '$.provider') IS NULL OR json_extract(meta, '$.provider') <> 'google-drive')
        LIMIT 1`
    } catch {
      existing = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM "folder"
        WHERE user_id = ${userId}
          AND parent_id IS NULL
          AND LOWER(name) IN ('trash', 'bin')
          AND ((meta ->> 'provider') IS NULL OR (meta ->> 'provider') <> 'google-drive')
        LIMIT 1`
    }
    if (existing && existing[0]?.id) return existing[0].id

    const id = await (async () => {
      const { randomBytes } = await import('crypto')
      const raw = randomBytes(24).toString('base64url')
      return raw.slice(0, 24) + '-' + raw.slice(24, 32)
    })()
    const nowSec = Math.floor(Date.now() / 1000)
    await db.$executeRaw`INSERT INTO "folder" (id, user_id, parent_id, name, items, meta, is_expanded, created_at, updated_at, data)
      VALUES (${id}, ${userId}, ${null}, ${'Trash'}, ${JSON.stringify({})}, ${JSON.stringify({ system: 'trash', provider: 'local' })}, ${0}, ${nowSec}, ${nowSec}, ${JSON.stringify({})})`
    return id
  }

  static async createFolderRecord(userId: string, name: string, parentId?: string | null): Promise<{ id: string }> {
    const { randomBytes } = await import('crypto')
    const raw = randomBytes(24).toString('base64url')
    const id = raw.slice(0, 24) + '-' + raw.slice(24, 32)
    const nowSec = Math.floor(Date.now() / 1000)
    const effectiveParentId = parentId && parentId.length > 0 ? parentId : await DriveDbService.getRootFolderId(userId)
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
    const isGoogle = await DriveDbService.isGoogleIntegrated(userId)
    let folders: any[] = []
    let files: any[] = []
    if (isGoogle) {
      const googleRootId = await DriveDbService.getGoogleRootFolderId(userId)
      if (!googleRootId) return []
      try {
        folders = await db.$queryRaw<any[]>`
          SELECT id, name,
            CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
            COALESCE(CAST(json_extract(meta, '$.starred') AS INT), 0) AS starred
          FROM "folder"
          WHERE user_id = ${userId}
            AND parent_id = ${googleRootId}
            AND COALESCE(CAST(json_extract(meta, '$.provider') AS TEXT), '') = 'google-drive'
          ORDER BY name ASC
        `
      } catch {
        folders = await db.$queryRaw<any[]>`
          SELECT id, name,
            CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
            COALESCE((meta ->> 'starred')::boolean::int, 0) AS starred
          FROM "folder"
          WHERE user_id = ${userId}
            AND parent_id = ${googleRootId}
            AND COALESCE((meta ->> 'provider')::text, '') = 'google-drive'
          ORDER BY name ASC
        `
      }
      try {
        files = await db.$queryRaw<any[]>`
          SELECT id, filename, path,
            CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
            COALESCE(CAST(json_extract(meta, '$.starred') AS INT), 0) AS starred
          FROM "file"
          WHERE user_id = ${userId}
            AND parent_id = ${googleRootId}
          ORDER BY filename ASC
        `
      } catch {
        files = await db.$queryRaw<any[]>`
          SELECT id, filename, path,
            CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
            COALESCE((meta ->> 'starred')::boolean::int, 0) AS starred
          FROM "file"
          WHERE user_id = ${userId}
            AND parent_id = ${googleRootId}
          ORDER BY filename ASC
        `
      }
    } else {
      try {
        folders = await db.$queryRaw<any[]>`
          SELECT id, name,
            CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
            COALESCE(CAST(json_extract(meta, '$.starred') AS INT), 0) AS starred
          FROM "folder"
          WHERE user_id = ${userId}
            AND parent_id IS NULL
            AND LOWER(name) NOT IN ('my drive')
            AND (json_extract(meta, '$.provider') IS NULL OR json_extract(meta, '$.provider') <> 'google-drive')
          ORDER BY name ASC
        `
      } catch {
        folders = await db.$queryRaw<any[]>`
          SELECT id, name,
            CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
            COALESCE((meta ->> 'starred')::boolean::int, 0) AS starred
          FROM "folder"
          WHERE user_id = ${userId}
            AND parent_id IS NULL
            AND LOWER(name) NOT IN ('my drive')
            AND (meta ->> 'provider') IS DISTINCT FROM 'google-drive'
          ORDER BY name ASC
        `
      }
      try {
        files = await db.$queryRaw<any[]>`
          SELECT id, filename, path,
            CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
            COALESCE(CAST(json_extract(meta, '$.starred') AS INT), 0) AS starred
          FROM "file"
          WHERE user_id = ${userId} AND (path IS NULL OR path = '')
          ORDER BY filename ASC
        `
      } catch {
        files = await db.$queryRaw<any[]>`
          SELECT id, filename, path,
            CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
            COALESCE((meta ->> 'starred')::boolean::int, 0) AS starred
          FROM "file"
          WHERE user_id = ${userId} AND (path IS NULL OR path = '')
          ORDER BY filename ASC
        `
      }
    }

    const folderEntries: FileEntry[] = folders.map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.id,
      isDirectory: true,
      size: null,
      modifiedMs: Number(f.updatedAt ?? nowSec) * 1000,
      starred: Boolean(Number(f.starred ?? 0)),
    }))

    const fileEntries: FileEntry[] = files.map((f: any) => ({
      id: f.id,
      name: f.filename,
      path: f.path ? String(f.path).replace(/^\/+/, '') + '/' + f.filename : f.filename,
      isDirectory: false,
      size: null,
      modifiedMs: Number(f.updatedAt ?? nowSec) * 1000,
      starred: Boolean(Number(f.starred ?? 0)),
    }))

    return [...folderEntries, ...fileEntries]
  }

  static async listFoldersByParent(userId: string, parentId?: string | null): Promise<FileEntry[]> {
    const effectiveParentId = parentId && parentId.length > 0
      ? parentId
      : await DriveDbService.getRootFolderId(userId)

    // Determine provider of the parent folder to filter children consistently
    let parentProvider: string | null = null
    try {
      const parentRow = await db.$queryRaw<any[]>`
        SELECT COALESCE(CAST(json_extract(meta, '$.provider') AS TEXT), '') AS provider
        FROM "folder" WHERE user_id = ${userId} AND id = ${effectiveParentId} LIMIT 1`
      parentProvider = parentRow && parentRow[0]?.provider ? String(parentRow[0].provider) : ''
    } catch {
      const parentRow = await db.$queryRaw<any[]>`
        SELECT COALESCE((meta ->> 'provider')::text, '') AS provider
        FROM "folder" WHERE user_id = ${userId} AND id = ${effectiveParentId} LIMIT 1`
      parentProvider = parentRow && parentRow[0]?.provider ? String(parentRow[0].provider) : ''
    }

    let rows: any[] = []
    if (parentProvider === 'google-drive') {
      try {
        rows = await db.$queryRaw<any[]>`
          SELECT id, name,
            CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
            COALESCE(CAST(json_extract(meta, '$.starred') AS INT), 0) AS starred
          FROM "folder"
          WHERE user_id = ${userId} AND parent_id = ${effectiveParentId}
            AND COALESCE(CAST(json_extract(meta, '$.provider') AS TEXT), '') = 'google-drive'
          ORDER BY name ASC
        `
      } catch {
        rows = await db.$queryRaw<any[]>`
          SELECT id, name,
            CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
            COALESCE((meta ->> 'starred')::boolean::int, 0) AS starred
          FROM "folder"
          WHERE user_id = ${userId} AND parent_id = ${effectiveParentId}
            AND COALESCE((meta ->> 'provider')::text, '') = 'google-drive'
          ORDER BY name ASC
        `
      }
    } else {
      try {
        rows = await db.$queryRaw<any[]>`
          SELECT id, name,
            CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
            COALESCE(CAST(json_extract(meta, '$.starred') AS INT), 0) AS starred
          FROM "folder"
          WHERE user_id = ${userId} AND parent_id = ${effectiveParentId}
            AND (json_extract(meta, '$.provider') IS NULL OR json_extract(meta, '$.provider') <> 'google-drive')
          ORDER BY name ASC
        `
      } catch {
        rows = await db.$queryRaw<any[]>`
          SELECT id, name,
            CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
            COALESCE((meta ->> 'starred')::boolean::int, 0) AS starred
          FROM "folder"
          WHERE user_id = ${userId} AND parent_id = ${effectiveParentId}
            AND (meta ->> 'provider') IS DISTINCT FROM 'google-drive'
          ORDER BY name ASC
        `
      }
    }

    const nowSec = Math.floor(Date.now() / 1000)
    return rows.map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.id,
      isDirectory: true,
      size: null,
      modifiedMs: Number(f.updatedAt ?? nowSec) * 1000,
      starred: Boolean(Number(f.starred ?? 0)),
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
      : await DriveDbService.getRootFolderId(userId)

    const nowSec = Math.floor(Date.now() / 1000)
    // Determine provider of the parent folder for consistent filtering
    let parentProvider: string | null = null
    try {
      const parentRow = await db.$queryRaw<any[]>`
        SELECT COALESCE(CAST(json_extract(meta, '$.provider') AS TEXT), '') AS provider
        FROM "folder" WHERE user_id = ${userId} AND id = ${effectiveParentId} LIMIT 1`
      parentProvider = parentRow && parentRow[0]?.provider ? String(parentRow[0].provider) : ''
    } catch {
      const parentRow = await db.$queryRaw<any[]>`
        SELECT COALESCE((meta ->> 'provider')::text, '') AS provider
        FROM "folder" WHERE user_id = ${userId} AND id = ${effectiveParentId} LIMIT 1`
      parentProvider = parentRow && parentRow[0]?.provider ? String(parentRow[0].provider) : ''
    }

    let files = await (async () => {
      if (parentProvider === 'google-drive') {
        try {
          return await db.$queryRaw<any[]>`
            SELECT id, filename, path,
              CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
              COALESCE(CAST(json_extract(meta, '$.starred') AS INT), 0) AS starred
            FROM "file"
            WHERE user_id = ${userId}
              AND parent_id = ${effectiveParentId}
            ORDER BY filename ASC
          `
        } catch {
          return await db.$queryRaw<any[]>`
            SELECT id, filename, path,
              CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
              COALESCE((meta ->> 'starred')::boolean::int, 0) AS starred
            FROM "file"
            WHERE user_id = ${userId}
              AND parent_id = ${effectiveParentId}
            ORDER BY filename ASC
          `
        }
      } else {
        try {
          return await db.$queryRaw<any[]>`
            SELECT id, filename, path,
              CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
              COALESCE(CAST(json_extract(meta, '$.starred') AS INT), 0) AS starred
            FROM "file"
            WHERE user_id = ${userId}
              AND parent_id = ${effectiveParentId}
            ORDER BY filename ASC
          `
        } catch {
          return await db.$queryRaw<any[]>`
            SELECT id, filename, path,
              CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt,
              COALESCE((meta ->> 'starred')::boolean::int, 0) AS starred
            FROM "file"
            WHERE user_id = ${userId}
              AND parent_id = ${effectiveParentId}
            ORDER BY filename ASC
          `
        }
      }
    })()

    const fileEntries: FileEntry[] = files.map((f: any) => {
      const rawPath = (f.path ?? '') as string
      let combined = ''
      if (rawPath) {
        const normalized = rawPath.replace(/^\/+/, '')
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
        starred: Boolean(Number(f.starred ?? 0)),
      }
    })

    return fileEntries
  }

  static async getFolderBreadcrumb(userId: string, folderId?: string | null): Promise<{ id: string; name: string }[]> {
    const effectiveId = folderId && folderId.length > 0 ? folderId : await DriveDbService.getRootFolderId(userId)
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
    if (segments.length === 0) {
      const rootId = await DriveDbService.getRootFolderId(userId)
      segments.push({ id: rootId, name: 'My Drive', parentId: null })
    }
    const ordered = segments.reverse()
    if (ordered.length > 0) {
      ordered[0] = { ...ordered[0], name: 'My Drive' }
    }
    return ordered.map(({ id, name }) => ({ id, name }))
  }

  static async listStarredEntries(userId: string): Promise<FileEntry[]> {
    const nowSec = Math.floor(Date.now() / 1000)

    // Folders starred
    let folders: any[] = []
    try {
      folders = await db.$queryRaw<any[]>`
        SELECT id, name,
          CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt
        FROM "folder"
        WHERE user_id = ${userId} AND COALESCE(CAST(json_extract(meta, '$.starred') AS INT), 0) = 1
        ORDER BY name ASC
      `
    } catch {
      folders = await db.$queryRaw<any[]>`
        SELECT id, name,
          CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt
        FROM "folder"
        WHERE user_id = ${userId} AND COALESCE((meta ->> 'starred')::boolean, false) = true
        ORDER BY name ASC
      `
    }

    // Files starred
    let files: any[] = []
    try {
      files = await db.$queryRaw<any[]>`
        SELECT id, filename, path,
          CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt
        FROM "file"
        WHERE user_id = ${userId} AND COALESCE(CAST(json_extract(meta, '$.starred') AS INT), 0) = 1
        ORDER BY filename ASC
      `
    } catch {
      files = await db.$queryRaw<any[]>`
        SELECT id, filename, path,
          CAST(CASE WHEN updated_at > 100000000000 THEN updated_at/1000 ELSE updated_at END AS INT) AS updatedAt
        FROM "file"
        WHERE user_id = ${userId} AND COALESCE((meta ->> 'starred')::boolean, false) = true
        ORDER BY filename ASC
      `
    }

    const folderEntries: FileEntry[] = folders.map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.id,
      isDirectory: true,
      size: null,
      modifiedMs: Number(f.updatedAt ?? nowSec) * 1000,
      starred: true,
    }))

    const fileEntries: FileEntry[] = files.map((f: any) => {
      const rawPath = (f.path ?? '') as string
      let combined = ''
      if (rawPath) {
        const normalized = rawPath.replace(/^\/+/, '')
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
        starred: true,
      }
    })

    return [...folderEntries, ...fileEntries]
  }
}

 

export const getRootFolderId = DriveDbService.getRootFolderId.bind(DriveDbService)
export const getTrashFolderId = DriveDbService.getTrashFolderId.bind(DriveDbService)
export const createFolderRecord = DriveDbService.createFolderRecord.bind(DriveDbService)
export const listRootEntries = DriveDbService.listRootEntries.bind(DriveDbService)
export const listFoldersByParent = DriveDbService.listFoldersByParent.bind(DriveDbService)
export const getFolderNameById = DriveDbService.getFolderNameById.bind(DriveDbService)
export const listFilesByParent = DriveDbService.listFilesByParent.bind(DriveDbService)
export const getFolderBreadcrumb = DriveDbService.getFolderBreadcrumb.bind(DriveDbService)
export const listStarredEntries = DriveDbService.listStarredEntries.bind(DriveDbService)


