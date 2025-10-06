'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import db from '@/lib/db'

const WorkspaceProviderSchema = z.enum(['local', 'aws', 'azure'])
const BoolString = z.union([z.boolean(), z.string()]).transform((v) => v === true || v === 'true')

const DriveConfigSchema = z.object({
  enabled: z.boolean(),
  workspace: z.object({
    enabled: z.boolean(),
    provider: WorkspaceProviderSchema,
  }),
  user: z.object({
    enabled: z.boolean(),
  }),
})

type WorkspaceProvider = z.infer<typeof WorkspaceProviderSchema>
type DriveConfigUI = z.infer<typeof DriveConfigSchema>

const DEFAULT_DRIVE_CONFIG: DriveConfigUI = {
  enabled: false,
  workspace: { enabled: false, provider: 'local' },
  user: { enabled: false },
}

export async function getDriveConfig(): Promise<DriveConfigUI> {
  const row = await db.config.findUnique({ where: { id: 1 } })
  const data = (row?.data || {}) as any

  const drive = (data?.drive || {}) as any

  // Back-compat: map legacy drive.provider ('google-drive'|'local') to workspace provider when present
  const legacyProvider = typeof drive.provider === 'string' ? String(drive.provider) : ''
  const normalizedLegacy: WorkspaceProvider | null = legacyProvider === 'google-drive'
    ? 'local' // legacy value was for user provider; keep workspace default local
    : legacyProvider === 'local' ? 'local' : null

  const parsed = DriveConfigSchema.safeParse({
    enabled: typeof drive.enabled === 'boolean' ? drive.enabled : DEFAULT_DRIVE_CONFIG.enabled,
    workspace: {
      enabled: typeof drive.workspace?.enabled === 'boolean' ? drive.workspace.enabled : DEFAULT_DRIVE_CONFIG.workspace.enabled,
      provider: WorkspaceProviderSchema.safeParse(drive.workspace?.provider).success
        ? drive.workspace.provider
        : (normalizedLegacy ?? DEFAULT_DRIVE_CONFIG.workspace.provider),
    },
    user: {
      enabled: typeof drive.user?.enabled === 'boolean' ? drive.user.enabled : DEFAULT_DRIVE_CONFIG.user.enabled,
    },
  })

  return parsed.success ? parsed.data : DEFAULT_DRIVE_CONFIG
}

type UpdateDriveConfigResult =
  | { status: 'success' }
  | { status: 'error'; message: string }

export async function updateDriveConfigAction(formData: FormData): Promise<UpdateDriveConfigResult> {
  try {
    const hasEnabled = formData.has('enabled')
    const hasWorkspaceEnabled = formData.has('workspaceEnabled')
    const hasWorkspaceProvider = formData.has('workspaceProvider')
    const hasUserEnabled = formData.has('userEnabled')

    if (!hasEnabled && !hasWorkspaceEnabled && !hasWorkspaceProvider && !hasUserEnabled) {
      return { status: 'error', message: 'No fields provided' }
    }

    const row = await db.config.findUnique({ where: { id: 1 } })
    const current = (row?.data || {}) as any
    const drive = (current?.drive || {}) as any

    const nextDrive: any = { ...drive }
    if (hasEnabled) nextDrive.enabled = BoolString.parse(formData.get('enabled'))
    if (hasWorkspaceEnabled) {
      nextDrive.workspace = {
        ...(drive.workspace || {}),
        enabled: BoolString.parse(formData.get('workspaceEnabled')),
        provider: (drive.workspace?.provider as WorkspaceProvider) || 'local',
      }
    }
    if (hasWorkspaceProvider) {
      const provider = WorkspaceProviderSchema.parse(String(formData.get('workspaceProvider') || ''))
      nextDrive.workspace = {
        ...(nextDrive.workspace || drive.workspace || {}),
        provider,
        enabled: typeof (nextDrive.workspace || {}).enabled === 'boolean' ? (nextDrive.workspace || {}).enabled : false,
      }
    }
    if (hasUserEnabled) {
      nextDrive.user = {
        ...(drive.user || {}),
        enabled: BoolString.parse(formData.get('userEnabled')),
      }
    }

    const next = {
      ...current,
      drive: nextDrive,
    }

    if (row) await db.config.update({ where: { id: 1 }, data: { data: next } })
    else await db.config.create({ data: { id: 1, data: next } })

    // Verify persisted
    const verify = await db.config.findUnique({ where: { id: 1 }, select: { data: true } })
    const persisted = ((verify?.data || {}) as any)?.drive
    if (!persisted || typeof persisted !== 'object') throw new Error('Verification failed: drive not persisted')

    revalidatePath('/admin/drive')
    return { status: 'success' }
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Failed to update drive config' }
  }
}


