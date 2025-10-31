import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { ProviderService } from '@/lib/modules/ai'
import db from '@/lib/db'
import { auth } from "@/lib/auth"
import { ChatStore } from '@/lib/modules/chat'

export const maxDuration = 30
export const runtime = 'nodejs'

/**
 * @swagger
 * /api/v1/tasks/title:
 *   post:
 *     tags: [Tasks]
 *     summary: Generate a chat title from recent messages or provided text
 *     description: If chatId is provided, requires auth; generates a title from the latest user message and persists it. Otherwise, cleans up the provided title string and returns it without writing to DB.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chatId:
 *                 type: string
 *                 description: Chat to read messages from (auth required)
 *               title:
 *                 type: string
 *                 description: Optional raw title text to clean when chatId is not provided
 *     responses:
 *       200:
 *         description: Title generated/cleaned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *       400:
 *         description: Validation error (missing inputs)
 *       401:
 *         description: Unauthorized (when chatId is used)
 *       500:
 *         description: Failed to generate title
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const chatId: string | undefined = typeof body?.chatId === 'string' ? body.chatId : undefined
    const title: string | undefined = typeof body?.title === 'string' ? body.title : undefined

    if (!chatId && (!title || typeof title !== 'string')) {
      return NextResponse.json({ error: 'title or chatId is required' }, { status: 400 })
    }

    // Load tasks config (id = 1)
    let config = await db.config.findUnique({ where: { id: 1 } })
    if (!config) {
      config = await db.config.create({ data: { id: 1, data: {} } })
    }

    const data = (config?.data || {}) as any
    const tasks = typeof data?.tasks === 'object' && data?.tasks !== null ? (data.tasks as any) : {}
    const taskModel: string | null = tasks.TASK_MODEL ?? null
    const titlePrompt: string | null = tasks.TITLE_PROMPT ?? null

    if (!taskModel || !titlePrompt) {
      return NextResponse.json({ error: 'TASK_MODEL and TITLE_PROMPT must be set in tasks config' }, { status: 400 })
    }

    // Resolve provider + model handle from model string (by provider_id first)
    const { getModelHandle, providerModelId, providerName, baseUrl } = await ProviderService.resolveAiProvider({ model: taskModel })

    // Determine seed text: from chat (auth + DB) or from provided title
    let seed: string
    let userId: string | null = null
    if (chatId) {
      const session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = session.user.id as string
      const messages = await ChatStore.loadChat({ chatId, userId })
      if (!messages || messages.length === 0) {
        return NextResponse.json({ error: 'No messages found' }, { status: 400 })
      }
      let found: string | null = null
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i] as any
        if (m?.role === 'user') {
          const parts = Array.isArray(m.parts) ? m.parts : []
          const text = parts
            .filter((p: any) => p?.type === 'text')
            .map((p: any) => String(p.text || ''))
            .join(' ')
            .trim()
          if (text) { found = text; break }
        }
      }
      if (!found) {
        return NextResponse.json({ error: 'No user text to title' }, { status: 400 })
      }
      seed = found
    } else {
      seed = title as string
    }

    // Generate a clean title using composed system prompt
    let result
    try {
      const systemPrefix = [
        'You are an expert title generator for chat sessions.',
        'Create a concise 4-6 word title that starts with a single relevant emoji.',
        'Use title case. Do not include quotes or trailing punctuation.',
        'Return only the title string, nothing else, no explanation.',
        'using these specific requiements:'
      ].join('\n')
      const composedSystem = `${systemPrefix}\n${titlePrompt}`
      result = await generateText({
        model: getModelHandle(providerModelId),
        system: composedSystem,
        prompt: seed,
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

    const cleanTitle = String(result?.text ?? '').trim() || seed.slice(0, 80)

    if (chatId && userId) {
      await ChatStore.updateChatTitle({ chatId, userId, title: cleanTitle })
    }

    return NextResponse.json({ title: cleanTitle })
  } catch (error: any) {
    console.error('POST /api/v1/tasks/title error:', error)
    return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 })
  }
}


