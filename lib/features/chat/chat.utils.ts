import type { UIMessage } from 'ai';
import { createIdGenerator } from 'ai';
import type {
  MessageMetadata,
  AppUIMessage,
  SelectedModelInfo,
  GenerationRequest,
  NormalizedModelParams,
  AdvancedControls,
  StreamArgs,
  SaveMessagesParams,
} from './chat.types';
import { ChatStore } from './chat.service';

/**
 * Message Processing Utilities
 */
export class MessageUtils {
  /**
   * Build message metadata for start of generation
   */
  static buildMessageMetadataStart(
    selectedModelInfo: SelectedModelInfo | null,
  ): MessageMetadata | undefined {
    if (!selectedModelInfo) return { createdAt: Date.now() };
    return {
      createdAt: Date.now(),
      model: selectedModelInfo,
      assistantDisplayName: selectedModelInfo.name,
      assistantImageUrl: selectedModelInfo.profile_image_url || undefined,
    };
  }

  /**
   * Filter messages to only text parts with character limits
   */
  static filterToTextParts(msgs: AppUIMessage[]): AppUIMessage[] {
    const MAX_CHARS_PER_MESSAGE = 4000; // hard cap to avoid single-message blowups
    return msgs
      .map((m) => ({
        ...m,
        parts: (m.parts || [])
          .filter((p: any) => p?.type === 'text')
          .map((p: any) => ({ ...p, text: String(p.text || '').slice(0, MAX_CHARS_PER_MESSAGE) })),
      }))
      .filter((m) => Array.isArray(m.parts) && m.parts.length > 0);
  }

  /**
   * Trim messages by character budget while preserving recent messages
   */
  static trimByCharBudget(
    msgs: AppUIMessage[],
    maxChars: number,
    minTailMessages: number = 8,
  ): AppUIMessage[] {
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
    const rebuilt: AppUIMessage[] = [];
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
  }

  /**
   * Check if messages contain a system message with content
   */
  static hasSystemInMessages(messages: AppUIMessage[]): boolean {
    return messages.some(
      (m) => m.role === 'system' && Array.isArray((m as any).parts) && (m as any).parts.some((p: any) => p?.type === 'text' && String(p.text || '').trim().length > 0)
    );
  }

  /**
   * Get system parameter for model (only if no system message exists)
   */
  static systemParamForModel(messages: AppUIMessage[], fallbackSystem?: string): string | undefined {
    const hasSystem = MessageUtils.hasSystemInMessages(messages);
    return hasSystem ? undefined : (fallbackSystem && String(fallbackSystem).trim()) || undefined;
  }
}

/**
 * Generation Parameter Utilities
 */
export class GenerationUtils {
  /**
   * Merge generation request parameters with model defaults
   */
  static mergeGenerationParams(request: GenerationRequest, defaults: NormalizedModelParams) {
    return {
      temperature: request.temperature ?? defaults.temperature,
      topP: request.topP ?? defaults.topP,
      maxOutputTokens: request.maxOutputTokens ?? defaults.maxOutputTokens,
      seed: request.seed ?? defaults.seed,
      stopSequences: request.stopSequences ?? defaults.stopSequences,
      topK: (request.advanced?.topK ?? defaults.topK) as number | undefined,
      presencePenalty: (request.advanced?.presencePenalty ?? defaults.presencePenalty) as number | undefined,
      frequencyPenalty: (request.advanced?.frequencyPenalty ?? defaults.frequencyPenalty) as number | undefined,
      toolChoice: (request.advanced?.toolChoice ?? defaults.toolChoice) as
        | 'auto'
        | 'none'
        | 'required'
        | { type: 'tool'; toolName: string }
        | undefined,
    };
  }
}

/**
 * Provider Options Utilities
 */
export class ProviderUtils {
  /**
   * Resolve OpenAI provider-specific options
   */
  static resolveOpenAIProviderOptions(modelName?: string | null): Record<string, any> {
    const supportsEncryptedReasoning = typeof modelName === 'string' && /gpt-5/i.test(modelName);
    return supportsEncryptedReasoning
      ? { reasoningSummary: 'detailed', include: ['reasoning.encrypted_content'] }
      : {};
  }
}

/**
 * Stream Building Utilities
 */
export class StreamUtils {
  /**
   * Build arguments for toUIMessageStream
   */
  static buildToUIMessageStreamArgs(
    originalMessages: AppUIMessage[],
    selectedModelInfo: SelectedModelInfo | null,
    persistParams: { finalChatId: string; userId: string },
    extraStartMetadata?: Record<string, unknown>,
  ) {
    return {
      originalMessages,
      generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
      messageMetadata: ({ part }: { part: any }) => {
        if (part.type === 'start') {
          const base = MessageUtils.buildMessageMetadataStart(selectedModelInfo) as Record<string, unknown> | undefined;
          if (!extraStartMetadata) return base as MessageMetadata | undefined;
          return { ...(base || {}), ...extraStartMetadata } as MessageMetadata;
        }
        if (part.type === 'finish') {
          return { totalTokens: part.totalUsage?.totalTokens } as MessageMetadata;
        }
        return undefined;
      },
      onFinish: async ({ messages }: { messages: AppUIMessage[] }) => {
        await PersistenceUtils.saveMessagesReplacingLastAssistant({
          messages,
          selectedModelInfo,
          finalChatId: persistParams.finalChatId,
          userId: persistParams.userId,
        });
      },
    };
  }
}

/**
 * Persistence Utilities
 */
export class PersistenceUtils {
  /**
   * Save messages while replacing the last assistant message with model info
   */
  static async saveMessagesReplacingLastAssistant(params: SaveMessagesParams): Promise<void> {
    const { messages, selectedModelInfo, finalChatId, userId } = params;
    
    const messagesWithModel = (() => {
      if (!selectedModelInfo) return messages as AppUIMessage[];
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
          } as AppUIMessage;
        }
        return m as AppUIMessage;
      });
    })();

    await ChatStore.saveChat({ 
      chatId: finalChatId, 
      userId, 
      messages: messagesWithModel as unknown as UIMessage[] 
    });
  }
}

/**
 * Validation Utilities
 */
export class ValidationUtils {
  /**
   * Type guard to check if an object is a UIMessage
   */
  static isUIMessage(obj: any): obj is UIMessage {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      'role' in obj &&
      'parts' in obj &&
      Array.isArray(obj.parts)
    );
  }

  /**
   * Validate and filter array of messages
   */
  static validateMessages(messages: unknown[]): UIMessage[] {
    return messages.filter(ValidationUtils.isUIMessage);
  }
}

/**
 * ID Generation Utilities
 */
export class IdUtils {
  /**
   * Create a message ID generator with consistent settings
   */
  static createMessageIdGenerator() {
    return createIdGenerator({ prefix: 'msg', size: 16 });
  }

  /**
   * Create a chat ID generator with consistent settings
   */
  static createChatIdGenerator() {
    return createIdGenerator({ prefix: 'chat', size: 16 });
  }
}
