import 'server-only'
import db from '@/lib/core/db/client'
import type { UIMessage } from 'ai'

export async function createChat(params: { id: string; userId: string; messages: UIMessage[] }) {
  await db.chat.create({
    data: { id: params.id, userId: params.userId, title: 'New Chat', chat: JSON.parse(JSON.stringify(params.messages)), meta: {}, updatedAt: new Date() },
  })
}

export async function updateChatMessages(params: { id: string; userId: string; messages: UIMessage[] }) {
  await db.chat.updateMany({
    where: { id: params.id, userId: params.userId },
    data: { chat: JSON.parse(JSON.stringify(params.messages)), updatedAt: new Date() },
  })
}

export async function getChatMessages(params: { id: string; userId: string }): Promise<UIMessage[] | null> {
  const row = await db.chat.findFirst({ where: { id: params.id, userId: params.userId }, select: { chat: true } })
  const raw = row?.chat as unknown
  return Array.isArray(raw) ? (raw as UIMessage[]) : row ? [] : null
}


