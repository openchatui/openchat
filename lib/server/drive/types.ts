import 'server-only'

export type DriveProvider = 'local' | 'google-drive'

export interface FileEntry {
  id: string
  name: string
  path: string
  isDirectory: boolean
  size: number | null
  modifiedMs: number
  starred?: boolean
  ownedByMe?: boolean
  shared?: boolean
  webViewLink?: string
  meta?: Record<string, any>
}

export function getDriveProvider(): DriveProvider {
  const raw = (process.env.DRIVE_PROVIDER || '').toLowerCase()
  if (raw === 'google-drive') return 'google-drive'
  return 'local'
}


