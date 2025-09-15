import type { UIMessage } from 'ai';
import type { MessageMetadata } from '@/types/messages';

export function buildMessageMetadataStart(
  selectedModelInfo: { id: string; name: string; profile_image_url?: string | null } | null,
): MessageMetadata | undefined {
  if (!selectedModelInfo) return { createdAt: Date.now() } as MessageMetadata;
  return {
    createdAt: Date.now(),
    model: selectedModelInfo,
    assistantDisplayName: selectedModelInfo.name,
    assistantImageUrl: selectedModelInfo.profile_image_url || undefined,
  } as MessageMetadata;
}

export const filterToTextParts = (msgs: UIMessage<MessageMetadata>[]) => {
  const MAX_CHARS_PER_MESSAGE = 4000; // hard cap to avoid single-message blowups
  return msgs
    .map((m) => ({
      ...m,
      parts: (m.parts || [])
        .filter((p: any) => p?.type === 'text')
        .map((p: any) => ({ ...p, text: String(p.text || '').slice(0, MAX_CHARS_PER_MESSAGE) })),
    }))
    .filter((m) => Array.isArray(m.parts) && m.parts.length > 0);
};

export const trimByCharBudget = (
  msgs: UIMessage<MessageMetadata>[],
  maxChars: number,
  minTailMessages: number = 8,
) => {
  if (msgs.length === 0) return msgs;
  const systemMsg = msgs.find((m) => m.role === 'system');
  const nonSystem = msgs.filter((m) => m !== systemMsg);
  const countChars = (arr: UIMessage[]) =>
    arr.reduce((sum, m) => {
      const txt = (m.parts || [])
        .filter((p: any) => p?.type === 'text')
        .map((p: any) => p.text || '')
        .join('');
      return sum + (txt?.length || 0);
    }, 0);
  let tail = nonSystem.slice(-minTailMessages);
  let head = nonSystem.slice(0, Math.max(0, nonSystem.length - tail.length));
  const rebuilt: UIMessage<MessageMetadata>[] = [];
  for (let i = tail.length - 1; i >= 0; i--) {
    rebuilt.unshift(tail[i]);
    if (countChars([...(systemMsg ? [systemMsg] : []), ...rebuilt]) > maxChars) {
      rebuilt.shift();
      break;
    }
  }
  for (let i = head.length - 1; i >= 0; i--) {
    const candidate = head[i];
    const next = [candidate, ...rebuilt];
    if (countChars([...(systemMsg ? [systemMsg] : []), ...next]) <= maxChars) {
      rebuilt.unshift(candidate);
    } else {
      break;
    }
  }
  return [...(systemMsg ? [systemMsg] : []), ...rebuilt];
};


