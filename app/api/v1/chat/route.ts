import { streamText, UIMessage, convertToModelMessages, validateUIMessages, smoothStream } from 'ai';
import { auth } from '@/lib/auth/auth';
import { NextRequest } from 'next/server';
import { loadChat, createChat, chatExists } from '@/lib/chat/chat-store';
import type { MessageMetadata } from '@/types/messages';
import { withSSEHeaders } from '@/lib/api/sse';
import { buildToUIMessageStreamArgs } from '@/lib/chat/stream';
import { filterToTextParts, trimByCharBudget } from '@/lib/chat/messages';
import { resolveModelInfoAndHandle } from '@/lib/chat/model-resolution';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// ----- Helpers moved to shared modules under lib/chat and lib/api -----

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
 *               temperature:
 *                 type: number
 *                 description: User-friendly generation control (0-2 typical)
 *               topP:
 *                 type: number
 *                 description: Nucleus sampling (0-1)
 *               maxOutputTokens:
 *                 type: number
 *                 description: Max tokens to generate
 *               seed:
 *                 type: number
 *                 description: Deterministic sampling seed if supported
 *               stopSequences:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Sequences that stop generation
 *               advanced:
 *                 type: object
 *                 description: Advanced model controls (for power users)
 *                 properties:
 *                   topK:
 *                     type: number
 *                   presencePenalty:
 *                     type: number
 *                   frequencyPenalty:
 *                     type: number
 *                   toolChoice:
 *                     oneOf:
 *                       - type: string
 *                         enum: [auto, none, required]
 *                       - type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [tool]
 *                           toolName:
 *                             type: string
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

    const { messages, modelId, chatId, message, temperature, topP, maxOutputTokens, seed, stopSequences, advanced }: { 
      messages?: UIMessage<MessageMetadata>[]; 
      modelId?: string; 
      chatId?: string;
      message?: UIMessage<MessageMetadata>;
      temperature?: number;
      topP?: number;
      maxOutputTokens?: number;
      seed?: number;
      stopSequences?: string[];
      advanced?: {
        topK?: number;
        presencePenalty?: number;
        frequencyPenalty?: number;
        toolChoice?: 'auto' | 'none' | 'required' | { type: 'tool'; toolName: string };
      };
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

    

    // Determine the model to use via shared resolver
    const { selectedModelInfo, modelName, modelContextTokens, modelHandle } = await resolveModelInfoAndHandle({
      userId,
      modelId,
      messages: finalMessages as UIMessage<MessageMetadata>[],
    });
    
    // Filter and trim helpers are imported from shared module

    const approxCharsPerToken = 4;
    const defaultMaxTokens = 12000; // be conservative by default
    const effectiveTokens = Math.max(
      2000,
      Math.floor((modelContextTokens ?? defaultMaxTokens) * 0.8)
    );
    const maxCharsBudget = effectiveTokens * approxCharsPerToken;

    // First attempt uses the full conversation without trimming
    const fullMessages = finalMessages as UIMessage<MessageMetadata>[];

    try {
      // First attempt: no trimming; if provider throws context error, we'll retry with trimmed payload
      const validatedFull = await validateUIMessages({ messages: fullMessages });
      const result = streamText({
        model: modelHandle,
        messages: convertToModelMessages(
          validatedFull as UIMessage<MessageMetadata>[]
        ),
        experimental_transform: smoothStream({
          delayInMs: 10, // optional: defaults to 10ms
          chunking: 'word', // optional: defaults to 'word'
        }),
        abortSignal: req.signal,
        temperature,
        topP,
        maxOutputTokens,
        seed,
        stopSequences,
        topK: advanced?.topK,
        presencePenalty: advanced?.presencePenalty,
        frequencyPenalty: advanced?.frequencyPenalty,
        toolChoice: advanced?.toolChoice,
      });
      const toUIArgs = buildToUIMessageStreamArgs(
        validatedFull as UIMessage<MessageMetadata>[],
        selectedModelInfo,
        'replace_last',
        { finalChatId, userId }
      );
      return withSSEHeaders(result.toUIMessageStreamResponse(toUIArgs));
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
        model: modelHandle,
        messages: convertToModelMessages(
          validatedTrimmed as UIMessage<MessageMetadata>[]
        ),
        abortSignal: req.signal,
        temperature,
        topP,
        maxOutputTokens,
        seed,
        stopSequences,
        topK: advanced?.topK,
        presencePenalty: advanced?.presencePenalty,
        frequencyPenalty: advanced?.frequencyPenalty,
        toolChoice: advanced?.toolChoice,
      });
      try {
        const toUIArgs = buildToUIMessageStreamArgs(
          validatedTrimmed as UIMessage<MessageMetadata>[],
          selectedModelInfo,
          'append_from_trimmed',
          { finalChatId, userId, fullMessagesForTrimmed: fullMessages as UIMessage<MessageMetadata>[] }
        );
        return withSSEHeaders(await retry.toUIMessageStreamResponse(toUIArgs));
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
