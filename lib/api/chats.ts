import { absoluteUrl, httpFetch } from './http'
import type { UIMessage } from 'ai'

export async function getInitialChats(): Promise<any[]> {
  const url = new URL(absoluteUrl('/api/v1/chats'))
  url.searchParams.set('offset', '0')
  url.searchParams.set('limit', '100')
  const res = await httpFetch(url.toString(), { method: 'GET' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error || 'Failed to fetch chats')
  }
  const json = await res.json().catch(() => ({ items: [] } as any))
  return (json?.items || json?.chats || []) as any[]
}

export async function getChatMessages(chatId: string): Promise<UIMessage[]> {
  const res = await httpFetch(absoluteUrl(`/api/v1/chats/${encodeURIComponent(chatId)}/messages`), { method: 'GET' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error || 'Failed to fetch messages')
  }
  const json = await res.json().catch(() => ({ messages: [] }))
  return (json?.messages || []) as UIMessage[]
}

export async function unarchiveChat(chatId: string): Promise<void> {
  const res = await httpFetch(absoluteUrl(`/api/v1/chats/${encodeURIComponent(chatId)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived: false }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error || 'Failed to unarchive chat')
  }
}

type AttachmentImage = { type: 'image'; image: string; mediaType: string; fileId?: string; localId?: string }
type AttachmentFile = { type: 'file'; data: string; mediaType: string; filename: string; fileId?: string; localId?: string }
type Attachment = AttachmentImage | AttachmentFile

export async function createInitialChat(input: {
  message: string;
  model: { id: string; name?: string; profile_image_url?: string | null };
  attachments?: Attachment[];
}): Promise<{ chatId: string } & { model: { id: string; name?: string; profile_image_url?: string | null } }> {
  const initialMessage = {
    id: `msg_${Date.now()}`,
    role: 'user',
    parts: [{ type: 'text', text: input.message }],
    metadata: {
      createdAt: Date.now(),
      model: { id: input.model.id, name: input.model.name ?? 'Unknown Model', profile_image_url: input.model.profile_image_url ?? null },
      ...(Array.isArray(input.attachments) && input.attachments.length > 0 ? { attachments: input.attachments } : {}),
    },
  }
  const res = await httpFetch(absoluteUrl('/api/v1/chats'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: { text: input.message, model: input.model, attachments: input.attachments || [] },
      initialMessage
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error || 'Failed to create chat')
  }
  const json = await res.json().catch(() => ({}))
  return { chatId: String((json as any)?.chatId || ''), model: input.model }
}


