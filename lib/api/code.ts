import { absoluteUrl, httpFetch } from './http'

export type CodeProvider = 'pyodide' | 'jupyter'

export interface CodeConfig {
  enabled: boolean
  provider: CodeProvider
}

export async function getCodeConfig(): Promise<CodeConfig> {
  const res = await httpFetch(absoluteUrl('/api/v1/code/config'), { method: 'GET' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new Error((data as { error?: string }).error || 'Failed to fetch code config')
  }
  const json = (await res.json()) as { code: CodeConfig }
  return json.code
}

export async function updateCodeConfig(input: Partial<CodeConfig>): Promise<void> {
  const res = await httpFetch(absoluteUrl('/api/v1/code/config/update'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: input }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    throw new Error((data as { error?: string }).error || 'Failed to update code config')
  }
}


