import { streamText, UIMessage, convertToModelMessages, validateUIMessages, smoothStream, stepCountIs } from 'ai';
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import type { MessageMetadata } from '@/lib/modules/chat/chat.types';
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
} from '@/lib/modules/chat';
import { ChatPostSchema } from '@/lib/modules/chat/schemas/chat';
import { getEffectivePermissionsForUser } from '@/lib/modules/access-control/permissions.service';

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
 *     tags: [Chat]
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
    console.error('[DEBUG] Chat API - session:', JSON.stringify({ 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id,
      cookies: req.cookies.getAll().map(c => c.name),
      origin: req.headers.get('origin'),
      host: req.headers.get('host'),
      referer: req.headers.get('referer')
    }));
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

    // Helper: Convert UIMessages with attachments to ModelMessages manually
    const convertMessagesToModelFormat = (messages: UIMessage<MessageMetadata>[]): any[] => {
      return messages.map((msg) => {
        const meta = (msg as any).metadata
        const attachments = meta?.attachments
        
        // Assistant messages - handle text and tool calls
        if (msg.role === 'assistant') {
          const textParts = msg.parts.filter((p: any) => p.type === 'text')
          const toolParts = msg.parts.filter((p: any) => 
            typeof p.type === 'string' && p.type.startsWith('tool-')
          )
          
          // If has tool calls, need special handling
          if (toolParts.length > 0) {
            const textContent = textParts.map((p: any) => p.text || '').join('')
            const toolCalls = toolParts.map((p: any) => ({
              type: 'tool-call',
              toolCallId: (p as any).toolCallId,
              toolName: (p as any).type?.replace('tool-', ''),
              args: (p as any).input || {}
            }))
            
            return {
              role: 'assistant',
              content: [
                { type: 'text', text: textContent },
                ...toolCalls
              ]
            }
          }
          
          // Simple text response
          const textContent = textParts.map((p: any) => p.text || '').join('')
          return {
            role: 'assistant',
            content: textContent
          }
        }
        
        // User messages - check for attachments
        if (msg.role === 'user') {
          const textContent = msg.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text || '')
            .join('')
          
          // If no attachments, return simple text
          if (!Array.isArray(attachments) || attachments.length === 0) {
            return {
              role: 'user',
              content: textContent
            }
          }
          
          // With attachments, use array of content parts
          const contentParts: any[] = [
            ...attachments.map((att: any) => {
              if (att.type === 'image') {
                return { type: 'image', image: att.image, mediaType: att.mediaType }
              } else {
                return { type: 'file', data: att.data, mediaType: att.mediaType }
              }
            }),
            { type: 'text', text: textContent }
          ]
          
          return {
            role: 'user',
            content: contentParts
          }
        }
        
        // System messages
        if (msg.role === 'system') {
          const textContent = msg.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text || '')
            .join('')
          return {
            role: 'system',
            content: textContent
          }
        }
        
        return msg
      })
    }

    try {
      // First attempt: no trimming; if provider throws context error, we'll retry with trimmed payload
      console.log('[DEBUG] Processing messages, count:', fullMessages.length);
      console.log('[DEBUG] Last message metadata:', JSON.stringify((fullMessages[fullMessages.length - 1] as any)?.metadata?.attachments, null, 2));
      
      // Convert UIMessages to ModelMessages manually to handle attachments
      const modelMessages = convertMessagesToModelFormat(fullMessages)
      
      console.log('[DEBUG] Model messages created, count:', modelMessages.length);
      console.log('[DEBUG] Last model message:', JSON.stringify(modelMessages[modelMessages.length - 1], null, 2).slice(0, 800));
      
      const result = streamText({
        model: modelHandle,
        messages: modelMessages,
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
        fullMessages as UIMessage<MessageMetadata>[],
        selectedModelInfo,
        { finalChatId, userId },
        undefined,
      );
      return result.toUIMessageStreamResponse(toUIArgs);
    } catch (err: any) {
      console.error('[ERROR] Chat API streamText failed:', err);
      console.error('[ERROR] Error stack:', err?.stack);
      console.error('[ERROR] Error message:', err?.message);
      console.error('[ERROR] Error code:', (err as any)?.code);
      console.error('[ERROR] Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
      
      const msg = String(err?.message || '')
      const code = String((err as any)?.code || '')
      const isContextError =
        code === 'context_length_exceeded' ||
        /context length|too many tokens|maximum context/i.test(msg)
      
      // Check for vision/image support errors
      const isVisionError = 
        /vision|image|multimodal|not supported/i.test(msg) ||
        /invalid.*content.*type/i.test(msg)
      
      const status = isContextError ? 413 : (isVisionError ? 400 : 502)
      const body = {
        error: isContextError
          ? 'Your message is too long for this model. Please shorten it or switch models.'
          : isVisionError
          ? `This model does not support image inputs. Please select a vision-capable model (e.g., GPT-4 Vision, Claude 3, Gemini Pro Vision). Details: ${msg}`
          : `Failed to generate a response. Error: ${msg}`,
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
