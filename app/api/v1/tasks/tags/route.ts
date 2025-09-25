import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/lib/auth"
import db from '@/lib/db'
import { generateText, type UIMessage } from 'ai'
import { ProviderService } from '@/lib/features/ai'
import { MessageUtils } from '@/lib/features/chat'

export const maxDuration = 30
export const runtime = 'nodejs'

type Message = UIMessage<any>

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickLastN<T>(arr: T[], n: number): T[] {
  if (!Array.isArray(arr)) return []
  return arr.slice(Math.max(0, arr.length - n))
}

function extractTextFromMessages(msgs: Message[]): string {
  const onlyText = MessageUtils.filterToTextParts(msgs as any)
  return onlyText
    .map((m) => {
      const role = m.role
      const text = (m.parts as any[]).filter(p => p?.type === 'text').map(p => p.text).join('\n')
      return `${role.toUpperCase()}: ${text}`
    })
    .join('\n\n')
    .slice(0, 8000)
}

function coerceTags(output: string): string[] {
  try {
    const parsed = JSON.parse(output)
    if (Array.isArray(parsed)) {
      return parsed
        .map((t) => String(t || ''))
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 5)
    }
  } catch {}
  const parts = output.split(/[,\n]/).map((t) => t.trim().toLowerCase()).filter(Boolean)
  return Array.from(new Set(parts)).slice(0, 5)
}

function toTagId(name: string): string {
  const base = String(name ?? '').toLowerCase().trim()
  const snake = base.replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_')
  return snake.replace(/^_+|_+$/g, '')
}

function toDisplayName(name: string): string {
  const id = toTagId(name)
  if (!id) return ''
  return id
    .split('_')
    .map(part => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}

/**
 * POST /api/v1/tasks/tags
 * Body: { chatId?: string, messages?: UIMessage[] }
 * - Uses last 5 messages (chatId wins if provided) to generate 5 keyword tags
 * - Saves tags to Chats.meta.tags for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const chatId: string | undefined = typeof body?.chatId === 'string' ? body.chatId : undefined
    const incomingMessages: Message[] | undefined = Array.isArray(body?.messages) ? (body.messages as Message[]) : undefined

    let messages: Message[] = []

    let userId: string | null = null
    if (chatId) {
      const session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = session.user.id
      const chat = await db.chat.findFirst({ where: { id: chatId, userId }, select: { chat: true, meta: true } })
      if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      const currentMeta = isPlainObject(chat.meta) ? (chat.meta as any) : {}
      const existingTags = Array.isArray(currentMeta?.tags) ? (currentMeta.tags as string[]).filter(Boolean) : []
      if (existingTags.length > 0) {
        return NextResponse.json({ tags: existingTags })
      }
      const raw = chat.chat as unknown
      messages = Array.isArray(raw) ? (raw as Message[]) : []
    } else if (incomingMessages && incomingMessages.length > 0) {
      messages = incomingMessages
    } else {
      return NextResponse.json({ error: 'chatId or messages are required' }, { status: 400 })
    }

    const lastFive = pickLastN(messages, 5)
    if (lastFive.length === 0) {
      return NextResponse.json({ error: 'No messages to analyze' }, { status: 400 })
    }

    // Load task model and optional custom prompt
    let config = await (db as any).config.findUnique({ where: { id: 1 } })
    if (!config) {
      config = await (db as any).config.create({ data: { id: 1, data: {} } })
    }
    const data = (config?.data || {}) as any
    const tasks = isPlainObject(data?.tasks) ? (data.tasks as any) : {}
    const taskModel: string | null = typeof tasks.TASK_MODEL === 'string' ? tasks.TASK_MODEL : null
    const tagsPrompt: string | null = typeof tasks.TAGS_PROMPT === 'string' ? tasks.TAGS_PROMPT : null

    if (!taskModel) {
      return NextResponse.json({ error: 'TASK_MODEL must be set in tasks config' }, { status: 400 })
    }

    const { getModelHandle, providerModelId, providerName, baseUrl } = await ProviderService.resolveAiProvider({ model: taskModel })

    const systemLines = [
      'You are an expert assistant that assigns concise topic tags to chats.',
      'Based on the provided recent messages, produce exactly 5 keyword-style tags.',
      'Rules:',
      '- Each tag must be 1-3 words, lowercase, no punctuation.',
      '- Avoid duplicates and generic terms like "chat" or "conversation".',
      '- Output only a JSON array of 5 strings, nothing else.',
    ]
    const system = tagsPrompt ? `${systemLines.join('\n')}\n${tagsPrompt}` : systemLines.join('\n')
    const prompt = extractTextFromMessages(lastFive)

    let result
    try {
      result = await generateText({
        model: getModelHandle(providerModelId),
        system,
        prompt,
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

    const tags = coerceTags(String(result?.text || ''))
    if (tags.length === 0) {
      return NextResponse.json({ error: 'Failed to extract tags' }, { status: 500 })
    }

    // Persist to chat meta if chatId provided
    if (chatId && userId) {
      const existing = await db.chat.findFirst({ where: { id: chatId, userId }, select: { meta: true } })
      if (!existing) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
      const currentMeta = isPlainObject(existing.meta) ? (existing.meta as any) : {}
      const nextMeta = { ...currentMeta, tags }
      await db.chat.updateMany({ where: { id: chatId, userId }, data: { meta: nextMeta, updatedAt: new Date() } })

      // Upsert unique tags per user into the tag table for indexing
      try {
        const inserts = tags.map((raw) => {
          const id = toTagId(raw)
          const displayName = toDisplayName(raw)
          return db.$executeRaw`INSERT INTO "tag" ("id", "user_id", "name", "meta") VALUES (${id}, ${userId}, ${displayName}, NULL) ON CONFLICT ("id", "user_id") DO NOTHING`
        })
        await db.$transaction(inserts)
      } catch (e) {
        // Non-fatal: indexing table write failure should not break the request
        console.warn('Failed to upsert tags into tag table', e)
      }
    }

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('POST /api/v1/tasks/tags error:', error)
    return NextResponse.json({ error: 'Failed to generate tags' }, { status: 500 })
  }
}


