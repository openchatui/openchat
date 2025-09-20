import { browserlessTools } from '@/lib/tools/web/browserless/tools'
import { openaiImageTools } from '@/lib/tools/images/openai/tools'

export function buildTools(options: { enableWebSearch?: boolean; enableImage?: boolean }): Record<string, unknown> | undefined {
  const { enableWebSearch, enableImage } = options
  const toolsEnabled = Boolean(enableWebSearch) || Boolean(enableImage)
  if (!toolsEnabled) return undefined
  return {
    ...(enableWebSearch ? browserlessTools : {}),
    ...(enableImage ? openaiImageTools : {}),
  } as any
}


