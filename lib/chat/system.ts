import db from '@/lib/db'

export async function composeSystemPrompt(input: {
  systemForModel?: string | null
  enableWebSearch?: boolean
  enableImage?: boolean
}): Promise<string | undefined> {
  const { systemForModel, enableWebSearch, enableImage } = input

  // Fetch optional prompts from config (websearch/image)
  let DB_BROWSERLESS_SYSTEM_PROMPT = ''
  let DB_IMAGE_SYSTEM_PROMPT = ''
  try {
    const cfg = await (db as any).config.findUnique({ where: { id: 1 }, select: { data: true } })
    const data = (cfg?.data || {}) as any
    const ws = (data?.websearch || {}) as any
    const img = (data?.image || {}) as any
    if (typeof ws?.SYSTEM_PROMPT === 'string') DB_BROWSERLESS_SYSTEM_PROMPT = String(ws.SYSTEM_PROMPT)
    if (typeof img?.SYSTEM_PROMPT === 'string') DB_IMAGE_SYSTEM_PROMPT = String(img.SYSTEM_PROMPT)
  } catch {}

  const ENV_BROWSERLESS_SYSTEM_PROMPT = (process.env.BROWSERLESS_SYSTEM_PROMPT || '').trim()
  const DEFAULT_BROWSERLESS_SYSTEM_PROMPT = [
    'Web browsing tools are available (Browserless). Use them when helpful to fetch up-to-date information.',
    'Prefer: navigate -> listAnchors/listSelectors -> click/type/keyPress as needed. Summarize findings with URLs.',
    'Keep actions minimal, avoid unnecessary clicks, and stop when you have enough info. If you finish, call sessionEnd.',
    'use navigate to navigate to URLs, when most efficent use URLs with search params to navigate to a page needed, quickly and efficently.',
    'If a CAPTCHA appears, use captchaWait and report status; do not attempt to solve it yourself.',
  ].join(' ')
  const browserlessSystemPrompt = (DB_BROWSERLESS_SYSTEM_PROMPT.trim() || ENV_BROWSERLESS_SYSTEM_PROMPT || DEFAULT_BROWSERLESS_SYSTEM_PROMPT)

  const ENV_IMAGE_SYSTEM_PROMPT = (process.env.IMAGE_SYSTEM_PROMPT || '').trim()
  const DEFAULT_IMAGE_SYSTEM_PROMPT = [
    'Image generation tools are available. When the user requests an image, call the generateImage tool with the intended prompt text only.',
    'Once it\'s been generated say The image of "description of image" is done',
    'Do not include the link or location of the image.'
  ].join(' ')
  const imageSystemPrompt = (DB_IMAGE_SYSTEM_PROMPT.trim() || ENV_IMAGE_SYSTEM_PROMPT || DEFAULT_IMAGE_SYSTEM_PROMPT)

  const systemSegments = [
    systemForModel || undefined,
    enableWebSearch ? browserlessSystemPrompt : undefined,
    enableImage ? imageSystemPrompt : undefined,
  ].filter((s) => typeof s === 'string' && String(s).trim().length > 0) as string[]

  return systemSegments.length > 0 ? systemSegments.join('\n\n') : undefined
}


