import db from '@/lib/db'
import type { CodeProvider, CodeConfig } from '@/types/code.types'

async function ensureConfigRow(): Promise<{ data: Record<string, unknown> }> {
  let row = await db.config.findUnique({ where: { id: 1 } })
  if (!row) {
    row = await db.config.create({ data: { id: 1, data: {} } })
  }
  return { data: (row.data || {}) as Record<string, unknown> }
}

export async function getCodeConfigFromDb(): Promise<CodeConfig> {
  const { data } = await ensureConfigRow()
  const code = (data?.code || {}) as Record<string, unknown>
  const enabled = typeof code.enabled === 'boolean' ? (code.enabled as boolean) : false
  const providerRaw = code.provider
  const provider: CodeProvider = providerRaw === 'jupyter' ? 'jupyter' : 'pyodide'
  return { enabled, provider }
}

export async function updateCodeConfigInDb(partial: Partial<CodeConfig>): Promise<CodeConfig> {
  const { data } = await ensureConfigRow()
  const current = (data?.code || {}) as Partial<CodeConfig>
  const nextCode: CodeConfig = {
    enabled: typeof partial.enabled === 'boolean' ? partial.enabled : (typeof current.enabled === 'boolean' ? current.enabled : false),
    provider: (partial.provider || current.provider || 'pyodide') as CodeProvider,
  }
  const nextData: Record<string, unknown> = { ...data, code: { enabled: nextCode.enabled, provider: nextCode.provider } }
  await db.config.update({ where: { id: 1 }, data: { data: nextData as any } })
  return nextCode
}


