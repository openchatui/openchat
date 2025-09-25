'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import db from '@/lib/db'

const CodeInterpreterSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['pyodide', 'jupyter']),
})

export type CodeInterpreterConfig = z.infer<typeof CodeInterpreterSchema>

const DEFAULTS: CodeInterpreterConfig = {
  enabled: false,
  provider: 'pyodide',
}

export async function getCodeInterpreterConfig(): Promise<CodeInterpreterConfig> {
  const row = await (db as any).config.findUnique({ where: { id: 1 } })
  const data = (row?.data || {}) as any
  const code = (data?.code || {}) as any
  const parsed = CodeInterpreterSchema.safeParse({
    enabled: typeof code.enabled === 'boolean' ? code.enabled : DEFAULTS.enabled,
    provider: (code.provider === 'pyodide' || code.provider === 'jupyter') ? code.provider : DEFAULTS.provider,
  })
  return parsed.success ? parsed.data : DEFAULTS
}

export async function updateCodeInterpreterConfig(formData: FormData): Promise<{ ok: boolean; message?: string }>{
  try {
    const input = {
      enabled: String(formData.get('enabled')) === 'true',
      provider: String(formData.get('provider') || ''),
    }
    const parsed = CodeInterpreterSchema.parse(input)

    const row = await (db as any).config.findUnique({ where: { id: 1 } })
    const current = (row?.data || {}) as any
    const next = {
      ...current,
      code: {
        ...(current?.code || {}),
        enabled: parsed.enabled,
        provider: parsed.provider,
      },
    }
    if (row) {
      await (db as any).config.update({ where: { id: 1 }, data: { data: next } })
    } else {
      await (db as any).config.create({ data: { id: 1, data: next } })
    }
    revalidatePath('/admin/code-interpreter')
    return { ok: true }
  } catch (error: any) {
    return { ok: false, message: error?.message || 'Failed to update' }
  }
}


