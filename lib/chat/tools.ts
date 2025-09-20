import { createBrowserlessTools } from '@/lib/tools/web/browserless/tools'
import { openaiImageTools } from '@/lib/tools/images/openai/tools'
import { getWebSearchConfigAction } from '@/actions/websearch'

export async function buildTools(options: { enableWebSearch?: boolean; enableImage?: boolean }): Promise<Record<string, unknown> | undefined> {
  const { enableWebSearch, enableImage } = options
  const toolsEnabled = Boolean(enableWebSearch) || Boolean(enableImage)
  if (!toolsEnabled) return undefined

  let webTools: Record<string, unknown> = {}
  if (enableWebSearch) {
    const ws = await getWebSearchConfigAction()
    const bl = ws.browserless || {}
    const token = String(bl.apiKey || '')
    const tools = createBrowserlessTools({
      token,
      stealth: bl.stealth !== false,
      stealthRoute: bl.stealthRoute === true,
      blockAds: bl.blockAds === true,
      headless: bl.headless !== false,
      locale: bl.locale || 'en-US',
      timezone: bl.timezone || 'America/Los_Angeles',
      userAgent: bl.userAgent || undefined,
      route: typeof bl.route === 'string' && bl.route.trim().length > 0 ? String(bl.route) : undefined,
    })
    webTools = tools as any
  }

  return {
    ...webTools,
    ...(enableImage ? openaiImageTools : {}),
  } as any
}


