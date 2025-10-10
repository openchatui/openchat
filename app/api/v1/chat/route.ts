import { streamText, UIMessage, convertToModelMessages, validateUIMessages, smoothStream, stepCountIs } from 'ai';
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import type { MessageMetadata } from '@/lib/features/chat/chat.types';
import { SSEService } from '@/lib/api';
import {
  StreamUtils,
  ModelResolutionService,
  SystemPromptService,
  ProviderUtils,
  ToolsService,
  ModelParametersService,
  ChatPreparationService,
  GenerationUtils,
  MessageUtils
} from '@/lib/features/chat';
import { ChatPostSchema } from '@/lib/api/schemas/chat';
import { getEffectivePermissionsForUser } from '@/lib/server';

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

    const rawBody = await req.json();
    const parsed = ChatPostSchema.safeParse(rawBody)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'content-type': 'application/json' } })
    }
    const { messages, modelId, chatId, message, temperature, topP, maxOutputTokens, seed, stopSequences, advanced, enableWebSearch: reqEnableWebSearch, enableImage: reqEnableImage, enableVideo: reqEnableVideo } = parsed.data as any

    const userId = session.user.id;
    let finalMessages: UIMessage<MessageMetadata>[] = [];
    let finalChatId: string = chatId || '';
    try {
      const prepared = await ChatPreparationService.prepareChatAndMessages({ userId, chatId, message, messages })
      finalChatId = prepared.finalChatId
      finalMessages = prepared.finalMessages
    } catch (e: any) {
      return new Response('Messages or message with chatId are required', { status: 400 })
    }

    // Enforce feature permissions per user AND respect per-request toggles
    const eff = await getEffectivePermissionsForUser(userId)
    const enableWebSearch = !!eff.features.web_search && reqEnableWebSearch === true
    const enableImage = !!eff.features.image_generation && reqEnableImage === true
    const enableVideo = reqEnableVideo === true // Gate by config elsewhere if needed

    // Determine the model to use via shared resolver
    const { selectedModelInfo, modelName, modelHandle } = await ModelResolutionService.resolveModelInfoAndHandle({
      userId,
      modelId,
      messages: finalMessages as UIMessage<MessageMetadata>[],
    });
    
    // First attempt uses the full conversation without trimming
    const fullMessages = finalMessages as UIMessage<MessageMetadata>[];

    // Load model default params with fallbacks and meta -> params mapping
    const rawModelParams = await ModelParametersService.fetchModelParams({
      userId,
      modelId,
      selectedModelId: selectedModelInfo?.id || null,
      modelName,
    })
    const defaults = ModelParametersService.normalizeModelParams(rawModelParams)
    const mergedGenParams = GenerationUtils.mergeGenerationParams({ temperature, topP, maxOutputTokens, seed, stopSequences, advanced }, defaults)

    const systemForModel = MessageUtils.systemParamForModel(fullMessages, defaults.systemPrompt)

    const combinedSystem = await SystemPromptService.composeSystemPrompt({ systemForModel, enableWebSearch, enableImage, enableVideo })

    const openaiProviderOptions: Record<string, any> = ProviderUtils.resolveOpenAIProviderOptions(modelName)

    const mergedTools = await ToolsService.buildTools({ enableWebSearch, enableImage, enableVideo })
    const toolsEnabled = Boolean(mergedTools)

    try {
      // First attempt: no trimming; if provider throws context error, we'll retry with trimmed payload
      const validatedFull = await validateUIMessages({ messages: fullMessages });
      const result = streamText({
        model: modelHandle,
        messages: convertToModelMessages(
          validatedFull as UIMessage<MessageMetadata>[]
        ),
        system: combinedSystem,
        experimental_transform: smoothStream({
          delayInMs: 10, // optional: defaults to 10ms
          chunking: 'word', // optional: defaults to 'word'
        }),
        abortSignal: req.signal,
        stopWhen: stepCountIs(24),
        providerOptions: {
          openai: openaiProviderOptions,
          openrouter: openaiProviderOptions,
        },
        temperature: mergedGenParams.temperature,
        topP: mergedGenParams.topP,
        maxOutputTokens: mergedGenParams.maxOutputTokens,
        seed: mergedGenParams.seed,
        stopSequences: mergedGenParams.stopSequences,
        topK: mergedGenParams.topK,
        presencePenalty: mergedGenParams.presencePenalty,
        frequencyPenalty: mergedGenParams.frequencyPenalty,
        toolChoice: toolsEnabled
          ? ((mergedGenParams.toolChoice && mergedGenParams.toolChoice !== 'none')
              ? mergedGenParams.toolChoice
              : 'auto')
          : 'none',
        tools: mergedTools as any,
      });
      const toUIArgs = StreamUtils.buildToUIMessageStreamArgs(
        validatedFull as UIMessage<MessageMetadata>[],
        selectedModelInfo,
        { finalChatId, userId },
        undefined,
      );
      return SSEService.withSSEHeaders(result.toUIMessageStreamResponse(toUIArgs));
    } catch (err: any) {
      const msg = String(err?.message || '')
      const code = String((err as any)?.code || '')
      const isContextError =
        code === 'context_length_exceeded' ||
        /context length|too many tokens|maximum context/i.test(msg)
      const status = isContextError ? 413 : 502
      const body = {
        error: isContextError
          ? 'Your message is too long for this model. Please shorten it or switch models.'
          : 'Failed to generate a response. Please try again.',
      }
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
