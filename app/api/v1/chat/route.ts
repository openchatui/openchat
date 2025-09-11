import { createOpenAI } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages, validateUIMessages, createIdGenerator } from 'ai';
import { auth } from '@/lib/auth';
import db from '@/lib/db';
import { NextRequest } from 'next/server';
import { loadChat, saveChat, createChat, chatExists } from '@/lib/chat-store';
import type { MessageMetadata } from '@/types/messages';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * @swagger
 * /api/v1/chat:
 *   post:
 *     tags: [Chats]
 *     summary: Send a chat message and stream assistant response
 *     description: Accepts either a full messages array or a single message with chatId, and streams a response.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *               message:
 *                 type: object
 *               chatId:
 *                 type: string
 *               modelId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Streams a response
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function POST(req: NextRequest) {
  try {
    // Get the current session
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, modelId, chatId, message }: { 
      messages?: UIMessage<MessageMetadata>[]; 
      modelId?: string; 
      chatId?: string;
      message?: UIMessage<MessageMetadata>;
    } = await req.json();

    const userId = session.user.id;
    let finalMessages: UIMessage<MessageMetadata>[] = [];
    let finalChatId: string = chatId || '';

    // Handle different request types
    if (message && chatId) {
      // Ensure we carry forward the provided chatId
      finalChatId = chatId;
      // Single message with chat ID - check if chat exists, create if not
      const exists = await chatExists(chatId, userId);
      
      if (!exists) {
        // Create the chat with the specific ID
        await createChat(userId, undefined, chatId);
        finalMessages = [message];
      } else {
        // Load previous messages and append new one
        const previousMessages = await loadChat(chatId, userId);
        if (previousMessages === null) {
          return new Response('Chat not found', { status: 404 });
        }
        const previousMessagesTyped = previousMessages as unknown as UIMessage<MessageMetadata>[];
        finalMessages = [...previousMessagesTyped, message];
      }
    } else if (messages && messages.length > 0) {
      // Full messages array provided (legacy support)
      finalMessages = messages;
      
      // Create new chat if no chatId provided
      if (!chatId) {
        finalChatId = await createChat(userId, messages[0]);
      }
    } else {
      return new Response('Messages or message with chatId are required', { status: 400 });
    }

    // Get OpenAI API key from connections
    const openaiConnection = await db.connection.findFirst({
      where: {
        type: 'openai-api',
        apiKey: {
          not: null
        }
      },
      select: {
        apiKey: true,
        baseUrl: true
      }
    });

    if (!openaiConnection?.apiKey) {
      return new Response('OpenAI API key not configured. Please add an OpenAI connection in settings.', { 
        status: 400 
      });
    }

    // Determine the model to use
    let modelName = 'gpt-4o'; // default
    // Capture model info for metadata persistence
    let selectedModelInfo: { id: string; name: string; profile_image_url?: string | null } | null = null;
    
    let modelContextTokens: number | null = null;
    if (modelId) {
      // Get the model from the database to get its name
      const model = await db.model.findUnique({
        where: { id: modelId },
        select: { id: true, name: true, meta: true }
      });
      
      if (model) {
        // Use the model name from the database
        modelName = model.name;
        selectedModelInfo = {
          id: model.id,
          name: model.name,
          // meta may contain profile_image_url as used in ModelSelector
          profile_image_url: (model as any).meta?.profile_image_url ?? null,
        };
        // Try to read context window tokens from meta
        const m = (model as any).meta || {};
        modelContextTokens =
          m.context_window || m.contextWindow || m.context || m.max_context ||
          m.details?.context_window || m.details?.context || null;
      }
    }

    // Fallbacks to populate selectedModelInfo if not yet set
    if (!selectedModelInfo) {
      // 1) Try to read from the last user message metadata
      for (let i = finalMessages.length - 1; i >= 0; i--) {
        const m = finalMessages[i] as UIMessage<MessageMetadata>;
        if (m.role === 'user' && m.metadata?.model) {
          selectedModelInfo = m.metadata.model;
          break;
        }
      }
    }

    if (!selectedModelInfo) {
      // 2) Try to find a model by name in DB to get profile image url
      const modelByName = await db.model.findFirst({
        where: { name: modelName },
        select: { id: true, name: true, meta: true },
      });
      if (modelByName) {
        selectedModelInfo = {
          id: modelByName.id,
          name: modelByName.name,
          profile_image_url: (modelByName as any).meta?.profile_image_url ?? null,
        };
      }
    }

    if (!selectedModelInfo) {
      // 3) As a last resort, still attach model name with a synthetic id
      selectedModelInfo = {
        id: modelName,
        name: modelName,
        profile_image_url: null,
      };
    }

    // Ensure the final modelName used for the provider matches the resolved selectedModelInfo
    // This makes the provider call reflect the model chosen by the user (via modelId or metadata)
    if (selectedModelInfo?.name) {
      modelName = selectedModelInfo.name;
    }

    const openai = createOpenAI({
      apiKey: openaiConnection.apiKey,
      baseURL: openaiConnection.baseUrl !== 'https://api.openai.com/v1' ? openaiConnection.baseUrl : undefined,
    });

    // Filter to text-only parts for provider payload and cap per-message length (used for retry only)
    const filterToTextParts = (msgs: UIMessage<MessageMetadata>[]) => {
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

    // Trim history by an approximate character budget
    const trimByCharBudget = (
      msgs: UIMessage<MessageMetadata>[],
      maxChars: number,
      minTailMessages: number = 8
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

    const approxCharsPerToken = 4;
    const defaultMaxTokens = 12000; // be conservative by default
    const effectiveTokens = Math.max(
      2000,
      Math.floor((modelContextTokens ?? defaultMaxTokens) * 0.8)
    );
    const maxCharsBudget = effectiveTokens * approxCharsPerToken;

    // First attempt uses the full conversation without trimming
    const fullMessages = finalMessages as UIMessage<MessageMetadata>[];

    const attemptStream = async (
      msgs: UIMessage<MessageMetadata>[]
    ): Promise<Response> => {
      const validatedMessages = await validateUIMessages({ messages: msgs });
      const result = streamText({
        model: openai(modelName),
        messages: convertToModelMessages(
          validatedMessages as UIMessage<MessageMetadata>[]
        ),
        abortSignal: req.signal,
      });
      return result.toUIMessageStreamResponse({
        originalMessages: validatedMessages as UIMessage<MessageMetadata>[],
        generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
        messageMetadata: ({ part }) => {
          if (part.type === 'start') {
            return {
              createdAt: Date.now(),
              ...(selectedModelInfo ? { model: selectedModelInfo } : {}),
            } as MessageMetadata;
          }
          if (part.type === 'finish') {
            return {
              totalTokens: part.totalUsage?.totalTokens,
            } as MessageMetadata;
          }
          return undefined;
        },
        onFinish: async ({ messages }) => {
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
                  },
                } as UIMessage<MessageMetadata>;
              }
              return m as UIMessage<MessageMetadata>;
            });
          })();
          await saveChat({
            chatId: finalChatId,
            userId,
            messages: messagesWithModel as unknown as UIMessage[],
          });
        },
      });
    };

    try {
      // First attempt: no trimming; if provider throws context error, we'll retry with trimmed payload
      const validatedFull = await validateUIMessages({ messages: fullMessages });
      const result = streamText({
        model: openai(modelName),
        messages: convertToModelMessages(
          validatedFull as UIMessage<MessageMetadata>[]
        ),
        abortSignal: req.signal,
      });
      return result.toUIMessageStreamResponse({
        originalMessages: validatedFull as UIMessage<MessageMetadata>[],
        generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
        messageMetadata: ({ part }) => {
          if (part.type === 'start') {
            return {
              createdAt: Date.now(),
              ...(selectedModelInfo ? { model: selectedModelInfo } : {}),
            } as MessageMetadata;
          }
          if (part.type === 'finish') {
            return {
              totalTokens: part.totalUsage?.totalTokens,
            } as MessageMetadata;
          }
          return undefined;
        },
        onFinish: async ({ messages }) => {
          // Save provider-returned messages as-is (full history + new assistant)
          await saveChat({
            chatId: finalChatId,
            userId,
            messages: messages as unknown as UIMessage[],
          });
        },
      });
    } catch (err: any) {
      const msg = String(err?.message || '');
      const code = String((err as any)?.code || '');
      const isContextError =
        code === 'context_length_exceeded' ||
        msg.toLowerCase().includes('context length') ||
        msg.toLowerCase().includes('too many tokens') ||
        msg.toLowerCase().includes('maximum context');
      if (!isContextError) throw err;
      // Retry with trimmed payload (text-only + budget), but DO NOT persist trimmed history
      const textOnly = filterToTextParts(fullMessages);
      const budgetTrimmed = trimByCharBudget(textOnly, maxCharsBudget, 8);
      const validatedTrimmed = await validateUIMessages({ messages: budgetTrimmed });
      const retry = streamText({
        model: openai(modelName),
        messages: convertToModelMessages(
          validatedTrimmed as UIMessage<MessageMetadata>[]
        ),
        abortSignal: req.signal,
      });
      try {
        return await retry.toUIMessageStreamResponse({
          originalMessages: validatedTrimmed as UIMessage<MessageMetadata>[],
          generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
          messageMetadata: ({ part }) => {
            if (part.type === 'start') {
              return {
                createdAt: Date.now(),
                ...(selectedModelInfo ? { model: selectedModelInfo } : {}),
              } as MessageMetadata;
            }
            if (part.type === 'finish') {
              return {
                totalTokens: part.totalUsage?.totalTokens,
              } as MessageMetadata;
            }
            return undefined;
          },
          onFinish: async ({ messages }) => {
            // Extract only the assistant reply from the trimmed conversation
            const assistant = [...messages].reverse().find((m) => m.role === 'assistant') as UIMessage<MessageMetadata> | undefined;
            const assistantWithModel = assistant
              ? ({
                  ...assistant,
                  metadata: {
                    ...(assistant as any).metadata,
                    ...(selectedModelInfo ? { model: selectedModelInfo } : {}),
                  },
                } as UIMessage<MessageMetadata>)
              : undefined;
            const toSave = assistantWithModel ? [...fullMessages, assistantWithModel] : fullMessages;
            await saveChat({
              chatId: finalChatId,
              userId,
              messages: toSave as unknown as UIMessage[],
            });
          },
        });
      } catch (err2: any) {
        const body = {
          type: 'error',
          code: 'context_length_exceeded',
          message:
            'Your input exceeds the context window of this model. Please start a new chat, switch to a larger-context model, or shorten your message.',
        };
        return new Response(JSON.stringify(body), {
          status: 413,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
