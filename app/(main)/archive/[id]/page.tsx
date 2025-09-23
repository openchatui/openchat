"use server"

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import db from "@/lib/db"
import { loadChatMessages } from "@/actions/chat"
import ChatMessages from "@/components/chat/chat-messages"

interface ArchiveChatPageProps {
  params: Promise<{ id: string }>
}

export default async function ArchiveChatPage({ params }: ArchiveChatPageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { id: chatId } = await params
  const userId = session.user.id

  const chatRow = await db.chat.findFirst({ where: { id: chatId, userId }, select: { id: true, title: true } })
  if (!chatRow) redirect('/')

  const messages = await loadChatMessages(chatId)

  // Compute assistant display info from messages (fallbacks)
  let assistantDisplayName = 'AI Assistant'
  let assistantImageUrl = '/avatars/01.png'
  for (let i = messages.length - 1; i >= 0; i--) {
    const m: any = messages[i]
    if (m?.role === 'assistant') {
      const meta = m.metadata || {}
      assistantDisplayName = (typeof meta.assistantDisplayName === 'string' && meta.assistantDisplayName && meta.assistantDisplayName !== 'Unknown Model')
        ? meta.assistantDisplayName
        : (meta?.model?.name || assistantDisplayName)
      assistantImageUrl = (typeof meta.assistantImageUrl === 'string' && meta.assistantImageUrl)
        ? meta.assistantImageUrl
        : (meta?.model?.profile_image_url || assistantImageUrl)
      break
    }
  }

  return (
    <div className="w-full p-4 flex justify-center">
      <div className="max-w-5xl w-full">
        <h1 className="text-lg font-semibold">{chatRow.title || 'Archived Chat'}</h1>
        <div className="mt-4">
          <ChatMessages
            messages={messages}
            isLoading={false}
            assistantDisplayName={assistantDisplayName}
            assistantImageUrl={assistantImageUrl}
          />
        </div>
      </div>
    </div>
  )
}


