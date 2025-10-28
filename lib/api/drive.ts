import { absoluteUrl, httpFetch } from './http'
import type { DriveConfig, UpdateDriveConfigInput } from '@/types/drive.types'

export async function getDriveConfig(): Promise<DriveConfig> {
  const res = await httpFetch(absoluteUrl('/api/v1/drive/config'), { method: 'GET' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new Error((data as { error?: string }).error || 'Failed to fetch drive config')
  }
  const json = (await res.json()) as { drive: DriveConfig }
  return json.drive
}

export async function updateDriveConfig(input: UpdateDriveConfigInput): Promise<void> {
  const res = await httpFetch(absoluteUrl('/api/v1/drive/config/update'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drive: input }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new Error((data as { error?: string }).error || 'Failed to update drive config')
  }
}

// ----- Drive Files & Folders API Helpers -----

export async function createFolder(input: { name: string; parent?: string | null }): Promise<{ id: string }> {
  const res = await httpFetch(absoluteUrl('/api/v1/drive/folder'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: input.name, parent: input.parent ?? undefined }),
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok) throw new Error(data?.error || 'Failed to create folder')
  return data as { id: string }
}

export async function moveFolder(input: { id: string; targetParentId: string }): Promise<void> {
  const res = await httpFetch(absoluteUrl(`/api/v1/drive/folder/${encodeURIComponent(input.id)}/move`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetParentId: input.targetParentId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any))
    throw new Error(data?.error || 'Failed to move folder')
  }
}

export async function moveFile(input: { id: string; targetParentId: string }): Promise<void> {
  const res = await httpFetch(absoluteUrl(`/api/v1/drive/file/${encodeURIComponent(input.id)}/move`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetParentId: input.targetParentId }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any))
    throw new Error(data?.error || 'Failed to move file')
  }
}

export async function moveFolderToTrash(input: { id: string }): Promise<void> {
  const res = await httpFetch(absoluteUrl(`/api/v1/drive/folder/${encodeURIComponent(input.id)}/trash`), {
    method: 'PATCH',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any))
    throw new Error(data?.error || 'Failed to move folder to trash')
  }
}

export async function moveFileToTrash(input: { id: string }): Promise<void> {
  const res = await httpFetch(absoluteUrl(`/api/v1/drive/file/${encodeURIComponent(input.id)}/trash`), {
    method: 'PATCH',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any))
    throw new Error(data?.error || 'Failed to move file to trash')
  }
}

export async function restoreFolder(input: { id: string }): Promise<{ parentId: string | null }> {
  const res = await httpFetch(absoluteUrl(`/api/v1/drive/folder/${encodeURIComponent(input.id)}/restore`), {
    method: 'PATCH',
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok) throw new Error(data?.error || 'Failed to restore folder')
  return { parentId: (data?.parentId as string | null) ?? null }
}

export async function restoreFile(input: { id: string }): Promise<{ parentId: string | null }> {
  const res = await httpFetch(absoluteUrl(`/api/v1/drive/file/${encodeURIComponent(input.id)}/restore`), {
    method: 'PATCH',
  })
  const data = await res.json().catch(() => ({} as any))
  if (!res.ok) throw new Error(data?.error || 'Failed to restore file')
  return { parentId: (data?.parentId as string | null) ?? null }
}

export async function renameFolder(input: { id: string; name: string }): Promise<void> {
  const res = await httpFetch(absoluteUrl(`/api/v1/drive/folder/${encodeURIComponent(input.id)}/rename`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: input.name }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any))
    throw new Error(data?.error || 'Failed to rename folder')
  }
}

export async function renameFile(input: { id: string; filename: string }): Promise<void> {
  const res = await httpFetch(absoluteUrl(`/api/v1/drive/file/${encodeURIComponent(input.id)}/rename`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: input.filename }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any))
    throw new Error(data?.error || 'Failed to rename file')
  }
}

export async function setFolderStarred(input: { id: string; starred: boolean }): Promise<void> {
  const res = await httpFetch(absoluteUrl(`/api/v1/drive/folder/${encodeURIComponent(input.id)}/star`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ starred: input.starred }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any))
    throw new Error(data?.error || 'Failed to update folder star')
  }
}

export async function setFileStarred(input: { id: string; starred: boolean }): Promise<void> {
  const res = await httpFetch(absoluteUrl(`/api/v1/drive/file/${encodeURIComponent(input.id)}/star`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ starred: input.starred }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any))
    throw new Error(data?.error || 'Failed to update file star')
  }
}

export async function moveItemsBulk(input: { targetParentId: string; folderIds?: string[]; fileIds?: string[] }): Promise<void> {
  const res = await httpFetch(absoluteUrl('/api/v1/drive/folder/move-bulk'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetParentId: input.targetParentId,
      folderIds: input.folderIds ?? [],
      fileIds: input.fileIds ?? [],
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any))
    throw new Error(data?.error || 'Failed to move items')
  }
}


