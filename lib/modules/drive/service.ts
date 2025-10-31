
import type { DriveProvider, FileEntry } from '@/lib/modules/drive/types'
import { getDriveProvider } from '@/lib/modules/drive/types'
import { listDirectory as localListDirectory, saveFile as localSaveFile } from '@/lib/modules/drive/providers/local.service'
import { syncUserGoogleDrive } from '@/lib/modules/drive/providers/google-drive.service'

// Re-export DB-backed listing helpers
export {
  listRootEntries,
  listFoldersByParent,
  listFilesByParent,
  getFolderBreadcrumb,
  getRootFolderId,
  getGoogleRootFolderId,
  findLocalRootFolderId,
  getTrashFolderId,
  getFolderNameById,
  isGoogleDriveFolder,
  createFolderRecord,
  listStarredEntries,
} from '@/lib/modules/drive/db.service'

export function currentProvider(): DriveProvider {
  return getDriveProvider()
}

export async function listDirectory(relative: string = ''): Promise<FileEntry[]> {
  const provider = getDriveProvider()
  if (provider === 'local') return localListDirectory(relative)
  throw new Error('listDirectory not supported for google-drive')
}

export async function saveFile(parentRelative: string, file: File): Promise<string> {
  const provider = getDriveProvider()
  if (provider === 'local') return localSaveFile(parentRelative, file)
  throw new Error('saveFile not supported for google-drive')
}

export async function sync(userId: string): Promise<{ folders: number; files: number }> {
  const provider = getDriveProvider()
  if (provider === 'google-drive') return syncUserGoogleDrive(userId)
  return { folders: 0, files: 0 }
}


