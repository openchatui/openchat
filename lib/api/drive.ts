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


