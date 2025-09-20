import type { UIMessage } from 'ai'
import type { MessageMetadata } from '@/types/messages'
import { loadChat, createChat, chatExists } from '@/lib/chat/chat-store'

export async function prepareChatAndMessages(input: {
  userId: string
  chatId?: string | null
  message?: UIMessage<MessageMetadata> | null
  messages?: UIMessage<MessageMetadata>[] | null
}): Promise<{ finalChatId: string; finalMessages: UIMessage<MessageMetadata>[] }> {
  const { userId, chatId, message, messages } = input
  let finalMessages: UIMessage<MessageMetadata>[] = []
  let finalChatId: string = chatId || ''

  if (message && chatId) {
    finalChatId = chatId
    const exists = await chatExists(chatId, userId)
    if (!exists) {
      await createChat(userId, undefined, chatId)
      finalMessages = [message]
    } else {
      const previousMessages = await loadChat(chatId, userId)
      if (previousMessages === null) {
        throw new Error('Chat not found')
      }
      const previousMessagesTyped = previousMessages as unknown as UIMessage<MessageMetadata>[]
      finalMessages = [...previousMessagesTyped, message]
    }
  } else if (messages && messages.length > 0) {
    finalMessages = messages
    if (!chatId) {
      finalChatId = await createChat(userId, messages[0])
    }
  } else {
    throw new Error('Messages or message with chatId are required')
  }

  return { finalChatId, finalMessages }
}


