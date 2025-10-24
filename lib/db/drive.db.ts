import 'server-only'
import db from '@/lib/db'
import type { DriveConfig, WorkspaceProvider, UpdateDriveConfigInput } from '@/types/drive.types'

async function ensureConfigRow(): Promise<{ data: Record<string, unknown> }> {
  let row = await db.config.findUnique({ where: { id: 1 } })
  if (!row) row = await db.config.create({ data: { id: 1, data: {} } })
  return { data: (row.data || {}) as Record<string, unknown> }
}

export async function getDriveConfigFromDb(): Promise<DriveConfig> {
  const { data } = await ensureConfigRow()
  const drive = (data.drive || {}) as Record<string, unknown>
  const enabled = typeof drive.enabled === 'boolean' ? (drive.enabled as boolean) : false
  const ws = (drive.workspace || {}) as Record<string, unknown>
  const user = (drive.user || {}) as Record<string, unknown>
  const providerRaw = typeof ws.provider === 'string' ? String(ws.provider) : ''
  const provider: WorkspaceProvider = (['local', 'aws', 'azure'] as const).includes(providerRaw as any)
    ? (providerRaw as WorkspaceProvider)
    : 'local'
  return {
    enabled,
    workspace: {
      enabled: typeof ws.enabled === 'boolean' ? (ws.enabled as boolean) : false,
      provider,
    },
    user: {
      enabled: typeof user.enabled === 'boolean' ? (user.enabled as boolean) : false,
    },
  }
}

export async function updateDriveConfigInDb(partial: UpdateDriveConfigInput): Promise<DriveConfig> {
  const { data } = await ensureConfigRow()
  const current = await getDriveConfigFromDb()
  const next: DriveConfig = {
    enabled: typeof partial.enabled === 'boolean' ? partial.enabled : current.enabled,
    workspace: {
      enabled: typeof partial.workspace?.enabled === 'boolean' ? partial.workspace.enabled : current.workspace.enabled,
      provider: (partial.workspace?.provider || current.workspace.provider || 'local') as WorkspaceProvider,
    },
    user: {
      enabled: typeof partial.user?.enabled === 'boolean' ? partial.user.enabled : current.user.enabled,
    },
  }

  const nextData: Record<string, unknown> = {
    ...data,
    drive: {
      enabled: next.enabled,
      workspace: { enabled: next.workspace.enabled, provider: next.workspace.provider },
      user: { enabled: next.user.enabled },
    },
  }
  await db.config.update({ where: { id: 1 }, data: { data: nextData as any } })
  return next
}

// Moved DB helpers from modules/drive/db.service.ts to a DAL repository
export * from '@/lib/modules/drive/db.service'


