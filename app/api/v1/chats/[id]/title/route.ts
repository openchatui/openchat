import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { loadChat, updateChatTitle } from '@/lib/chat-store'
import { generateText } from 'ai'
import { resolveAiProvider } from '@/lib/ai/provider'
import db from '@/lib/db'

export const maxDuration = 30
export const runtime = 'nodejs'

/**
 * POST /api/v1/chats/:id/title
 * - Generates a clean title from the chat's user message(s) and updates the DB
 * - Returns { title }
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: chatId } = await ctx.params
    const userId = session.user.id as string

    // Load messages for this chat (ownership enforced in loadChat)
    const messages = await loadChat(chatId, userId)
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages found' }, { status: 400 })
    }

    // Prefer the latest user message text
    let seed: string | null = null
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if ((m as any)?.role === 'user') {
        const parts = Array.isArray((m as any).parts) ? (m as any).parts : []
        const text = parts.filter((p: any) => p?.type === 'text').map((p: any) => String(p.text || '')).join(' ').trim()
        if (text) {
          seed = text
          break
        }
      }
    }

    if (!seed) {
      return NextResponse.json({ error: 'No user text to title' }, { status: 400 })
    }

    // Load tasks config (id = 1) for model + prompt
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

    const { getModelHandle, providerModelId, providerName, baseUrl } = await resolveAiProvider({ model: taskModel })

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

    // Persist title (ownership enforced)
    await updateChatTitle(chatId, userId, cleanTitle)

    return NextResponse.json({ title: cleanTitle })
  } catch (error: any) {
    console.error('POST /api/v1/chats/[id]/title error:', error)
    return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 })
  }
}


