import 'server-only'
import db from '@/lib/db'
import { google, drive_v3, docs_v1 } from 'googleapis'
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
  ownedByMe?: boolean
  shared?: boolean
  webViewLink?: string
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
  const redirectUri = process.env.NEXTAUTH_URL+'/api/auth/callback/google-drive'
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

async function getAuthedDocsClientForUser(userId: string) {
  const account = await getUserAccount(userId)
  if (!account) throw new Error('No Google Drive account connected')

  const oauth2 = getOAuthClient()
  const expiryMs = account.expires_at ? Number(account.expires_at) * 1000 : undefined
  oauth2.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.refresh_token ? expiryMs : undefined,
  })

  const docs = google.docs({ version: 'v1', auth: oauth2 })
  return docs
}


async function listAllDriveFiles(drive: drive_v3.Drive): Promise<GoogleDriveFile[]> {
  const files: GoogleDriveFile[] = []
  let pageToken: string | undefined = undefined
  const fields = 'nextPageToken, files(id, name, mimeType, parents, trashed, createdTime, modifiedTime, ownedByMe, shared, webViewLink)'
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
        meta: { 
          provider: 'google-drive',
          ownedByMe: f.ownedByMe ?? true,
          shared: f.shared ?? false,
          webViewLink: f.webViewLink ?? undefined
        },
      },
      create: {
        id: f.id,
        userId,
        parentId,
        name: f.name,
        items: {},
        meta: { 
          provider: 'google-drive',
          ownedByMe: f.ownedByMe ?? true,
          shared: f.shared ?? false,
          webViewLink: f.webViewLink ?? undefined
        },
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
        meta: { 
          provider: 'google-drive', 
          mimeType: fi.mimeType,
          ownedByMe: fi.ownedByMe ?? true,
          shared: fi.shared ?? false,
          webViewLink: fi.webViewLink ?? undefined
        },
      },
      create: {
        id: fi.id,
        userId,
        parentId,
        filename: fi.name,
        meta: { 
          provider: 'google-drive', 
          mimeType: fi.mimeType,
          ownedByMe: fi.ownedByMe ?? true,
          shared: fi.shared ?? false,
          webViewLink: fi.webViewLink ?? undefined
        },
        createdAt: createdAt || nowSec,
        updatedAt: updatedAt || nowSec,
        path: null,
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

export async function getGoogleDriveFileStream(userId: string, fileId: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; size?: number }> {
  const drive = await getAuthedDriveClientForUser(userId)
  
  // Get file metadata to determine mime type and size
  const { data: metadata } = await drive.files.get({
    fileId,
    fields: 'mimeType,size'
  })
  
  // Get file content as stream
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  )
  
  return {
    stream: response.data as any,
    mimeType: metadata.mimeType ?? 'application/octet-stream',
    size: metadata.size ? parseInt(metadata.size, 10) : undefined
  }
}

export async function exportGoogleDriveFile(
  userId: string, 
  fileId: string, 
  mimeType: string
): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; size?: number }> {
  const drive = await getAuthedDriveClientForUser(userId)
  
  // Export Google Workspace files (Docs, Sheets, etc.) to specified format
  const response = await drive.files.export(
    { fileId, mimeType },
    { responseType: 'stream' }
  )
  
  return {
    stream: response.data as any,
    mimeType,
    size: undefined
  }
}

export function isGoogleWorkspaceFile(mimeType: string): boolean {
  return mimeType.startsWith('application/vnd.google-apps.')
}

export function getExportMimeType(googleMimeType: string): string | null {
  const exportMap: Record<string, string> = {
    'application/vnd.google-apps.document': 'application/pdf',
    'application/vnd.google-apps.spreadsheet': 'application/pdf',
    'application/vnd.google-apps.presentation': 'application/pdf',
    'application/vnd.google-apps.drawing': 'application/pdf',
  }
  return exportMap[googleMimeType] || null
}

export async function getGoogleDriveAbout(userId: string): Promise<{ 
  storageQuota: { limit: string; usage: string; usageInDrive: string } | null
  user: { emailAddress?: string; displayName?: string } | null
}> {
  const drive = await getAuthedDriveClientForUser(userId)
  
  const { data } = await drive.about.get({
    fields: 'storageQuota,user'
  })
  
  return {
    storageQuota: data.storageQuota ? {
      limit: data.storageQuota.limit ?? '0',
      usage: data.storageQuota.usage ?? '0',
      usageInDrive: data.storageQuota.usageInDrive ?? '0'
    } : null,
    user: data.user ? {
      emailAddress: data.user.emailAddress ?? undefined,
      displayName: data.user.displayName ?? undefined
    } : null
  }
}

export async function updateGoogleDocPlainText(
  userId: string,
  docId: string,
  text: string,
): Promise<void> {
  const docs = await getAuthedDocsClientForUser(userId)
  // Fetch current document to compute range length
  const current = await docs.documents.get({ documentId: docId })
  const body: any = current.data.body
  let endIndex = 1
  if (body && Array.isArray(body.content) && body.content.length > 0) {
    const last = body.content[body.content.length - 1]
    const rawEnd: number | undefined = typeof last?.endIndex === 'number' ? last.endIndex : undefined
    // Google Docs body ends with a terminal newline; you cannot delete it. Subtract 1 safely.
    endIndex = Math.max(1, (rawEnd ?? 1) - 1)
  }

  const requests: docs_v1.Schema$Request[] = []
  if (endIndex > 1) {
    requests.push({
      deleteContentRange: {
        range: { startIndex: 1, endIndex },
      },
    })
  }
  requests.push({
    insertText: {
      location: { index: 1 },
      text,
    },
  })

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests },
  })
}

// Convert a subset of HTML (inline styles and basic blocks) into Google Docs rich text
export async function updateGoogleDocFromHTML(
  userId: string,
  docId: string,
  html: string,
): Promise<void> {
  const docs = await getAuthedDocsClientForUser(userId)

  type RGB = { r: number; g: number; b: number }
  type Style = {
    bold?: boolean
    italic?: boolean
    underline?: boolean
    strikethrough?: boolean
    fontSizePt?: number
    color?: RGB
    backgroundColor?: RGB
  }

  const decodeEntities = (input: string): string => {
    return input
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

  const parseColor = (value?: string | null): RGB | undefined => {
    if (!value) return undefined
    const v = value.trim().toLowerCase()
    if (v === 'black') return { r: 0, g: 0, b: 0 }
    if (v === 'white') return { r: 1, g: 1, b: 1 }
    const hsl = /^hsl\(\s*([0-9.]+)\s*(?:deg|)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)$/i.exec(v)
    const hsla = /^hsla\(\s*([0-9.]+)\s*(?:deg|)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)\s*\)$/i.exec(v)
    const hslm = hsl || hsla
    if (hslm) {
      // If saturation is 0%, color is grayscale; convert lightness to rgb
      const s = Math.max(0, Math.min(100, parseFloat(hslm[2]))) / 100
      const l = Math.max(0, Math.min(100, parseFloat(hslm[3]))) / 100
      if (s === 0) {
        return { r: l, g: l, b: l }
      }
      // Non-grayscale HSL not handled here; fall through to other parsers
    }
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v)
    if (hex) {
      const h = hex[1]
      if (h.length === 3) {
        const r = parseInt(h[0] + h[0], 16)
        const g = parseInt(h[1] + h[1], 16)
        const b = parseInt(h[2] + h[2], 16)
        return { r: r / 255, g: g / 255, b: b / 255 }
      } else {
        const r = parseInt(h.slice(0, 2), 16)
        const g = parseInt(h.slice(2, 4), 16)
        const b = parseInt(h.slice(4, 6), 16)
        return { r: r / 255, g: g / 255, b: b / 255 }
      }
    }
    const mRgb = /^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/i.exec(v)
    if (mRgb) {
      const r = clamp01(parseInt(mRgb[1], 10) / 255)
      const g = clamp01(parseInt(mRgb[2], 10) / 255)
      const b = clamp01(parseInt(mRgb[3], 10) / 255)
      return { r, g, b }
    }
    const mRgba = /^rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9.]+)\s*\)$/i.exec(v)
    if (mRgba) {
      const r = clamp01(parseInt(mRgba[1], 10) / 255)
      const g = clamp01(parseInt(mRgba[2], 10) / 255)
      const b = clamp01(parseInt(mRgba[3], 10) / 255)
      return { r, g, b }
    }
    return undefined
  }

  const parseFontSizePt = (value?: string | null): number | undefined => {
    if (!value) return undefined
    const v = value.trim().toLowerCase()
    const mPx = /^([0-9]+)px$/.exec(v)
    if (mPx) {
      const px = parseInt(mPx[1], 10)
      return Math.max(1, Math.round(px * 0.75))
    }
    const mPt = /^([0-9]+)pt$/.exec(v)
    if (mPt) {
      return Math.max(1, parseInt(mPt[1], 10))
    }
    return undefined
  }

  // Track active styles using a stack
  type StackEntry = { tag: string; style: Style }
  const stack: StackEntry[] = []

  const openTag = (tag: string, attrs: string) => {
    const s: Style = {}
    const tagName = tag.toLowerCase()
    if (tagName === 'strong' || tagName === 'b') s.bold = true
    if (tagName === 'em' || tagName === 'i') s.italic = true
    if (tagName === 'u') s.underline = true
    if (tagName === 's' || tagName === 'strike' || tagName === 'del') s.strikethrough = true

    // legacy <font color="...">
    const colorAttr = /\bcolor\s*=\s*"([^"]+)"/i.exec(attrs) || /\bcolor\s*=\s*'([^']+)'/i.exec(attrs)
    if (colorAttr) {
      const c = parseColor(colorAttr[1])
      if (c) s.color = c
    }

    const styleAttr = /\bstyle\s*=\s*"([^"]*)"/i.exec(attrs) || /\bstyle\s*=\s*'([^']*)'/i.exec(attrs)
    if (styleAttr) {
      const css = styleAttr[1]
      css.split(';').forEach(decl => {
        const [rawKey, rawVal] = decl.split(':')
        if (!rawKey || !rawVal) return
        const key = rawKey.trim().toLowerCase()
        const val = rawVal.trim()
        if (key === 'color') {
          const c = parseColor(val)
          if (c) s.color = c
        } else if (key === 'background-color') {
          const c = parseColor(val)
          if (c) s.backgroundColor = c
        } else if (key === 'font-size') {
          const pt = parseFontSizePt(val)
          if (pt) s.fontSizePt = pt
        }
      })
    }
    stack.push({ tag: tagName, style: s })
  }

  const closeTag = (tag: string) => {
    const t = tag.toLowerCase()
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].tag === t) {
        stack.splice(i, 1)
        break
      }
    }
  }

  const isBlockThatAddsNewline = (tag: string): boolean => {
    return /^(p|div|h[1-6]|li)$/i.test(tag)
  }

  const runs: { start: number; end: number; style: Style }[] = []
  let out = ''
  let index = 0

  const currentMergedStyle = (): Style => {
    const merged: Style = {}
    for (const entry of stack) {
      const s = entry.style
      if (s.bold) merged.bold = true
      if (s.italic) merged.italic = true
      if (s.underline) merged.underline = true
      if (s.strikethrough) merged.strikethrough = true
      if (s.fontSizePt) merged.fontSizePt = s.fontSizePt
      if (s.color) merged.color = s.color
      if (s.backgroundColor) merged.backgroundColor = s.backgroundColor
    }
    return merged
  }

  const addText = (text: string) => {
    if (text.length === 0) return
    const style = currentMergedStyle()
    const start = index
    out += text
    index += text.length
    // Only create a run if some style is present
    if (
      style.bold || style.italic || style.underline || style.strikethrough ||
      style.fontSizePt || style.color || style.backgroundColor
    ) {
      runs.push({ start, end: index, style })
    }
  }

  const tokens = html.split(/(<[^>]+>)/g)
  for (const tok of tokens) {
    if (!tok) continue
    if (tok.startsWith('<')) {
      const selfClose = /^<\s*(br)\s*\/?>$/i.exec(tok)
      if (selfClose) {
        addText('\n')
        continue
      }
      const open = /^<\s*([a-z0-9]+)([^>]*)>$/i.exec(tok)
      if (open) {
        const [, tag, attrs] = open
        openTag(tag, attrs || '')
        continue
      }
      const close = /^<\s*\/\s*([a-z0-9]+)\s*>$/i.exec(tok)
      if (close) {
        const [, tag] = close
        if (isBlockThatAddsNewline(tag)) addText('\n')
        closeTag(tag)
        continue
      }
      // Unknown tag: ignore
    } else {
      addText(decodeEntities(tok))
    }
  }

  // Fetch current document to compute range length
  const current = await docs.documents.get({ documentId: docId })
  const body: any = current.data.body
  let endIndex = 1
  if (body && Array.isArray(body.content) && body.content.length > 0) {
    const last = body.content[body.content.length - 1]
    const rawEnd: number | undefined = typeof last?.endIndex === 'number' ? last.endIndex : undefined
    endIndex = Math.max(1, (rawEnd ?? 1) - 1)
  }

  const requests: docs_v1.Schema$Request[] = []
  if (endIndex > 1) {
    requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex } } })
  }
  requests.push({ insertText: { location: { index: 1 }, text: out } })

  // Reset baseline styles across the entire inserted text so removals (e.g., bold off) take effect
  requests.push({
    updateTextStyle: {
      range: { startIndex: 1, endIndex: 1 + out.length },
      textStyle: ({ bold: false, italic: false, underline: false, strikethrough: false } as docs_v1.Schema$TextStyle),
      fields: 'bold,italic,underline,strikethrough'
    }
  })

  // Clear colors baseline to avoid bleed; specific runs will re-apply
  requests.push({
    updateTextStyle: {
      range: { startIndex: 1, endIndex: 1 + out.length },
      textStyle: ({ foregroundColor: null, backgroundColor: null } as unknown as docs_v1.Schema$TextStyle),
      fields: 'foregroundColor,backgroundColor'
    }
  })

  const toDocsColor = (c: RGB | undefined) => c ? { color: { rgbColor: { red: c.r, green: c.g, blue: c.b } } } : undefined
  const isWhite = (c?: RGB) => !!c && c.r >= 0.99 && c.g >= 0.99 && c.b >= 0.99
  const isGrayscale = (c?: RGB) => !!c && Math.abs(c.r - c.g) < 0.01 && Math.abs(c.r - c.b) < 0.01
  const invert = (c: RGB): RGB => ({ r: 1 - c.r, g: 1 - c.g, b: 1 - c.b })

  for (const run of runs) {
    const textStyle: docs_v1.Schema$TextStyle = {}
    const fields: string[] = []
    if (run.style.bold !== undefined) { textStyle.bold = true; fields.push('bold') }
    if (run.style.italic !== undefined) { textStyle.italic = true; fields.push('italic') }
    if (run.style.underline !== undefined) { textStyle.underline = true; fields.push('underline') }
    if (run.style.strikethrough !== undefined) { textStyle.strikethrough = true; fields.push('strikethrough') }
    if (run.style.fontSizePt) { textStyle.fontSize = { magnitude: run.style.fontSizePt, unit: 'PT' }; fields.push('fontSize') }
    // Invert grayscale colors before sending to Google Docs, skip explicit white
    const sendColor = isWhite(run.style.color)
      ? undefined
      : (isGrayscale(run.style.color) && run.style.color ? invert(run.style.color) : run.style.color)
    const fg = toDocsColor(sendColor)
    if (fg) { (textStyle as any).foregroundColor = fg; fields.push('foregroundColor') }
    const bg = toDocsColor(run.style.backgroundColor)
    if (bg) {
      // If foreground equals background (or very close), avoid setting foreground to keep text readable
      const fgRgb = sendColor
      const bgRgb = run.style.backgroundColor
      const close = (a: number, b: number) => Math.abs(a - b) < 0.02
      const same = !!(fgRgb && bgRgb && close(fgRgb.r, bgRgb.r) && close(fgRgb.g, bgRgb.g) && close(fgRgb.b, bgRgb.b))
      if (same) {
        // Remove foregroundColor if we would match background
        const idx = fields.indexOf('foregroundColor')
        if (idx >= 0) fields.splice(idx, 1)
        delete (textStyle as any).foregroundColor
      }
      (textStyle as any).backgroundColor = bg
      fields.push('backgroundColor')
    }
    if (fields.length === 0) continue
    requests.push({
      updateTextStyle: {
        textStyle,
        range: { startIndex: 1 + run.start, endIndex: 1 + run.end },
        fields: fields.join(',')
      }
    })
  }

  await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests } })
}

export async function getGoogleFileModifiedTime(
  userId: string,
  fileId: string,
): Promise<number | null> {
  const drive = await getAuthedDriveClientForUser(userId)
  const { data } = await drive.files.get({ fileId, fields: 'modifiedTime' })
  const iso = data.modifiedTime
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : ms
}

// Skeletons for future Google Drive operations (not yet implemented)
export async function moveItem(): Promise<never> { throw new Error('Not implemented') }
export async function trashItem(): Promise<never> { throw new Error('Not implemented') }
export async function restoreItem(): Promise<never> { throw new Error('Not implemented') }
export async function createFolder(): Promise<never> { throw new Error('Not implemented') }


