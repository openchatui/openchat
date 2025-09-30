'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import db from '@/lib/db'

const DriveProviderSchema = z.enum(['local', 'gdrive'])

export type DriveProviderUI = z.infer<typeof DriveProviderSchema>

export async function getDriveProviderConfig(): Promise<DriveProviderUI> {
  const row = await (db as any).config.findUnique({ where: { id: 1 } })
  const data = (row?.data || {}) as any
  const saved = String(data?.drive?.provider || '')
  if (saved === 'google-drive') return 'gdrive'

  const env = (process.env.STORAGE_PROVIDER || process.env.DRIVE_PROVIDER || 'local').toLowerCase()
  return env === 'gdrive' || env === 'google-drive' ? 'gdrive' : 'local'
}

export type UpdateDriveProviderResult =
  | { status: 'success' }
  | { status: 'error'; message: string }

export async function updateDriveProviderAction(formData: FormData): Promise<UpdateDriveProviderResult> {
  try {
    const provider = DriveProviderSchema.parse(String(formData.get('provider') || ''))
    const mapped = provider === 'gdrive' ? 'google-drive' : 'local'

    const row = await (db as any).config.findUnique({ where: { id: 1 } })
    const current = (row?.data || {}) as any
    const next = {
      ...current,
      drive: {
        ...(current?.drive || {}),
        provider: mapped,
      },
    }

    if (row) {
      await (db as any).config.update({ where: { id: 1 }, data: { data: next } })
    } else {
      await (db as any).config.create({ data: { id: 1, data: next } })
    }

    revalidatePath('/admin/drive')
    return { status: 'success' }
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Failed to update drive provider' }
  }
}


