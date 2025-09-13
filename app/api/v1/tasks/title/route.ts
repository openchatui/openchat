import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { resolveAiProvider } from '@/lib/ai/provider'
import db from '@/lib/db'

export const maxDuration = 30
export const runtime = 'nodejs'

/**
 * POST /api/v1/tasks/title
 * Body: { title: string }
 * - Loads TASK_MODEL and TITLE_PROMPT from config
 * - Uses TITLE_PROMPT as system and provided title as prompt to generate a clean title
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const title: string | undefined = body?.title

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    // Load tasks config (id = 1)
    let config = await (db as any).config.findUnique({ where: { id: 1 } })
    if (!config) {
      config = await (db as any).config.create({ data: { id: 1, data: {} } })
    }

    const data = (config?.data || {}) as any
    const tasks = typeof data?.tasks === 'object' && data?.tasks !== null ? (data.tasks as any) : {}
    const taskModel: string | null = tasks.TASK_MODEL ?? null
    const titlePrompt: string | null = tasks.TITLE_PROMPT ?? null

    if (!taskModel || !titlePrompt) {
      return NextResponse.json({ error: 'TASK_MODEL and TITLE_PROMPT must be set in tasks config' }, { status: 400 })
    }

    // Resolve provider + model handle from model string (by provider_id first)
    const { getModelHandle, providerModelId, providerName, baseUrl } = await resolveAiProvider({ model: taskModel })

    // Generate a clean title using composed system prompt
    let result
    try {
      const systemPrefix = [
        'You are an expert title generator for chat sessions.',
        'Create a concise 3-5 word title that starts with a single relevant emoji.',
        'Use title case. Do not include quotes or trailing punctuation.',
        'Return only the title string, nothing else, no explanation.',
        'using these specific requiements:'
      ].join('\n')
      const composedSystem = `${systemPrefix}\n${titlePrompt}`
      result = await generateText({
        model: getModelHandle(providerModelId),
        system: composedSystem,
        prompt: title,
      })
    } catch (err: any) {
      const causeName = (err?.cause as any)?.name || undefined
      const isHtml = String(err?.message || '').includes('Unexpected token') || String((err?.cause as any)?.message || '').includes('<!DOCTYPE')
      const hint = isHtml ? 'Provider returned HTML. Verify model exists and baseUrl/apiKey are correct.' : undefined
      return NextResponse.json({
        error: 'Provider request failed',
        details: {
          provider: providerName,
          baseUrl: baseUrl,
          model: providerModelId,
          cause: causeName,
          message: String(err?.message || 'Unknown error').slice(0, 500),
          ...(hint ? { hint } : {}),
        }
      }, { status: 502 })
    }

    const cleanTitle = String(result?.text ?? '').trim()
    return NextResponse.json({ title: cleanTitle || title })
  } catch (error: any) {
    console.error('POST /api/v1/tasks/title error:', error)
    return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 })
  }
}


