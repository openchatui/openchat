import type { UIMessage } from 'ai';
import { createIdGenerator } from 'ai';
import type { MessageMetadata } from '@/types/messages';
import { buildMessageMetadataStart } from '@/lib/chat/messages';
import { saveMessagesReplacingLastAssistant, saveMessagesAppendAssistantFromTrimmed } from '@/lib/chat/persist';

export function buildToUIMessageStreamArgs(
  originalMessages: UIMessage<MessageMetadata>[],
  selectedModelInfo: { id: string; name: string; profile_image_url?: string | null } | null,
  saveStrategy: 'replace_last' | 'append_from_trimmed',
  persistParams: { finalChatId: string; userId: string; fullMessagesForTrimmed?: UIMessage<MessageMetadata>[] },
) {
  return {
    originalMessages,
    generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
    messageMetadata: ({ part }: { part: any }) => {
      if (part.type === 'start') {
        return buildMessageMetadataStart(selectedModelInfo);
      }
      if (part.type === 'finish') {
        return { totalTokens: part.totalUsage?.totalTokens } as MessageMetadata;
      }
      return undefined;
    },
    onFinish: async ({ messages }: { messages: UIMessage<MessageMetadata>[] }) => {
      if (saveStrategy === 'replace_last') {
        await saveMessagesReplacingLastAssistant(messages, selectedModelInfo, persistParams.finalChatId, persistParams.userId);
      } else {
        await saveMessagesAppendAssistantFromTrimmed(
          (persistParams.fullMessagesForTrimmed || []) as UIMessage<MessageMetadata>[],
          messages,
          selectedModelInfo,
          persistParams.finalChatId,
          persistParams.userId,
        );
      }
    },
  } as const;
}


