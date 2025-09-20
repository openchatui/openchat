import { saveChat } from '@/lib/chat/chat-store';
import type { UIMessage } from 'ai';
import type { MessageMetadata } from '@/types/messages';

export async function saveMessagesReplacingLastAssistant(
  messages: UIMessage<MessageMetadata>[],
  selectedModelInfo: { id: string; name: string; profile_image_url?: string | null } | null,
  finalChatId: string,
  userId: string,
) {
  const messagesWithModel = (() => {
    if (!selectedModelInfo) return messages as UIMessage<MessageMetadata>[];
    const lastIndex = messages.length - 1;
    return messages.map((m, idx) => {
      if (idx === lastIndex && m.role === 'assistant') {
        return {
          ...m,
          metadata: {
            ...(m as any).metadata,
            model: selectedModelInfo,
            assistantDisplayName: selectedModelInfo.name,
            assistantImageUrl: selectedModelInfo.profile_image_url || undefined,
          },
        } as UIMessage<MessageMetadata>;
      }
      return m as UIMessage<MessageMetadata>;
    });
  })();

  await saveChat({ chatId: finalChatId, userId, messages: messagesWithModel as unknown as UIMessage[] });
}
