import 'server-only'
import db from '@/lib/db'
import { google, drive_v3 } from 'googleapis'
import { auth } from '@/lib/auth'
import { getTrashFolderId, getRootFolderId } from '@/lib/server/drive/db.service'

type GoogleDriveFile = {
  id: string
  name: string
  mimeType: string
  parents?: string[]
  trashed?: boolean
  createdTime?: string
  modifiedTime?: string
}

function toUnixSeconds(dateIso?: string | null): number {
  if (!dateIso) return Math.floor(Date.now() / 1000)
  const ms = Date.parse(dateIso)
  if (Number.isNaN(ms)) return Math.floor(Date.now() / 1000)
  return Math.floor(ms / 1000)
}

async function getUserAccount(userId: string) {
  return db.account.findFirst({ where: { userId, provider: 'google-drive' } })
}

function getOAuthClient() {
  const clientId = process.env.DRIVE_CLIENT_ID
  const clientSecret = process.env.DRIVE_CLIENT_SECRET
  const redirectUri = process.env.NEXTAUTH_URL || 'http://localhost:3000/api/auth/callback/google-drive'
  if (!clientId || !clientSecret) {
    return new google.auth.OAuth2()
  }
  return new google.auth.OAuth2({ clientId, clientSecret, redirectUri })
}

async function getAuthedDriveClientForUser(userId: string) {
  const account = await getUserAccount(userId)
  if (!account) throw new Error('No Google Drive account connected')

  const oauth2 = getOAuthClient()
  const expiryMs = account.expires_at ? Number(account.expires_at) * 1000 : undefined
  oauth2.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.refresh_token ? expiryMs : undefined,
  })

  const hasClientCreds = Boolean(process.env.DRIVE_CLIENT_ID && process.env.DRIVE_CLIENT_SECRET)
  if (hasClientCreds && account.refresh_token) {
    try {
      await oauth2.getAccessToken()
      const tokens = oauth2.credentials
      if (tokens && (tokens.access_token || tokens.expiry_date || tokens.refresh_token)) {
        await db.account.update({
          where: { provider_providerAccountId: { provider: 'google-drive', providerAccountId: account.providerAccountId } },
          data: {
            access_token: tokens.access_token ?? account.access_token ?? undefined,
            expires_at: tokens.expiry_date ? Math.floor(Number(tokens.expiry_date) / 1000) : account.expires_at ?? undefined,
            refresh_token: tokens.refresh_token ?? account.refresh_token ?? undefined,
          },
        })
      }
    } catch {
      // proceed with existing access_token
    }
  }

  const drive = google.drive({ version: 'v3', auth: oauth2 })
  return drive
}

async function listAllDriveFiles(drive: drive_v3.Drive): Promise<GoogleDriveFile[]> {
  const files: GoogleDriveFile[] = []
  let pageToken: string | undefined = undefined
  const fields = 'nextPageToken, files(id, name, mimeType, parents, trashed, createdTime, modifiedTime)'
  const q = "trashed = false and not mimeType = 'application/vnd.google-apps.shortcut'"
  do {
    const { data }: { data: drive_v3.Schema$FileList } = await drive.files.list({
      q,
      fields,
      spaces: 'drive',
      pageSize: 1000,
      pageToken,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    })
    const batch = (data.files ?? []) as GoogleDriveFile[]
    files.push(...batch)
    pageToken = data.nextPageToken ?? undefined
  } while (pageToken)
  return files
}

export async function syncUserGoogleDrive(userId: string): Promise<{ folders: number; files: number }> {
  const drive = await getAuthedDriveClientForUser(userId)

  // Ensure local system trash exists; root will be normalized to Google root if available
  await getTrashFolderId(userId)

  // Identify the user's Google Drive root folder id to normalize parents
  let googleRootId: string | null = null
  try {
    const aboutRes: { data: drive_v3.Schema$About } = await drive.about.get({ fields: 'rootFolderId' })
    googleRootId = (aboutRes.data as any).rootFolderId ?? null
  } catch {
    googleRootId = null
  }

  const items = await listAllDriveFiles(drive)

  const folders = items.filter(i => i.mimeType === 'application/vnd.google-apps.folder')
  const files = items.filter(i => i.mimeType !== 'application/vnd.google-apps.folder')

  // Fallback derive Google root id from parents if API call didn't provide it
  if (!googleRootId) {
    const folderIds = new Set<string>(folders.map(f => f.id))
    const parentIds = new Set<string>()
    for (const it of [...folders, ...files]) {
      for (const p of (it.parents ?? [])) parentIds.add(p)
    }
    for (const pid of parentIds) {
      if (!folderIds.has(pid)) {
        googleRootId = pid
        break
      }
    }
  }

  // Determine the effective root id we will use in our DB for top-level items
  let effectiveRootId: string = await getRootFolderId(userId)
  if (googleRootId) {
    const nowSec = Math.floor(Date.now() / 1000)
    // Upsert Google My Drive
    await db.folder.upsert({
      where: { id_userId: { id: googleRootId, userId } },
      update: {
        name: 'My Drive',
        parentId: null,
        updatedAt: nowSec,
        meta: { provider: 'google-drive' },
      },
      create: {
        id: googleRootId,
        userId,
        parentId: null,
        name: 'My Drive',
        items: {},
        meta: { provider: 'google-drive' },
        isExpanded: false,
        createdAt: nowSec,
        updatedAt: nowSec,
        data: {},
      },
    })

    // Upsert Google Trash
    const googleTrashId = `${googleRootId}-trash`
    await db.folder.upsert({
      where: { id_userId: { id: googleTrashId, userId } },
      update: {
        name: 'Trash',
        parentId: null,
        updatedAt: nowSec,
        meta: { system: 'trash', provider: 'google-drive' },
      },
      create: {
        id: googleTrashId,
        userId,
        parentId: null,
        name: 'Trash',
        items: {},
        meta: { system: 'trash', provider: 'google-drive' },
        isExpanded: false,
        createdAt: nowSec,
        updatedAt: nowSec,
        data: {},
      },
    })
    effectiveRootId = googleRootId
  }

  const nowSec = Math.floor(Date.now() / 1000)

  // Upsert folders first (composite key: id + userId)
  for (const f of folders) {
    const createdAt = toUnixSeconds(f.createdTime)
    const updatedAt = toUnixSeconds(f.modifiedTime)
    const rawParent = Array.isArray(f.parents) && f.parents.length > 0 ? f.parents[0] : null
    const parentId = (!rawParent || (googleRootId && rawParent === googleRootId))
      ? effectiveRootId
      : rawParent
    await db.folder.upsert({
      where: { id_userId: { id: f.id, userId } },
      update: {
        name: f.name,
        parentId,
        updatedAt,
        meta: { provider: 'google-drive' },
      },
      create: {
        id: f.id,
        userId,
        parentId,
        name: f.name,
        items: {},
        meta: { provider: 'google-drive' },
        isExpanded: false,
        createdAt: createdAt || nowSec,
        updatedAt: updatedAt || nowSec,
        data: {},
      },
    })
  }

  // Upsert files
  for (const fi of files) {
    const createdAt = toUnixSeconds(fi.createdTime)
    const updatedAt = toUnixSeconds(fi.modifiedTime)
    const rawParent = Array.isArray(fi.parents) && fi.parents.length > 0 ? fi.parents[0] : null
    const parentId = (!rawParent || (googleRootId && rawParent === googleRootId))
      ? effectiveRootId
      : rawParent
    await db.file.upsert({
      where: { id: fi.id },
      update: {
        userId,
        parentId,
        filename: fi.name,
        updatedAt,
        meta: { provider: 'google-drive', mimeType: fi.mimeType },
      },
      create: {
        id: fi.id,
        userId,
        parentId,
        filename: fi.name,
        meta: { provider: 'google-drive', mimeType: fi.mimeType },
        createdAt: createdAt || nowSec,
        updatedAt: updatedAt || nowSec,
        path: null,
        accessControl: {},
      },
    })
  }

  return { folders: folders.length, files: files.length }
}

export async function syncCurrentUserGoogleDrive(): Promise<{ folders: number; files: number }> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error('Not authenticated')
  return syncUserGoogleDrive(userId)
}

// Skeletons for future Google Drive operations (not yet implemented)
export async function moveItem(): Promise<never> { throw new Error('Not implemented') }
export async function trashItem(): Promise<never> { throw new Error('Not implemented') }
export async function restoreItem(): Promise<never> { throw new Error('Not implemented') }
export async function createFolder(): Promise<never> { throw new Error('Not implemented') }


