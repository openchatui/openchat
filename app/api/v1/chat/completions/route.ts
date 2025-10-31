import { streamText } from 'ai'
import { ProviderService } from '@/lib/modules/ai'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30
export const runtime = 'nodejs'

/**
 * @swagger
 * /api/v1/chat/completions:
 *   post:
 *     tags: [Chat]
 *     summary: Generate AI chat completion
 *     description: Stream a chat completion response from the configured AI provider.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: The user's input message to generate a completion for
 *                 example: "What is the capital of France?"
 *               model:
 *                 type: string
 *                 description: Optional model ID to use. If not provided, uses the default model.
 *                 example: "gpt-4"
 *               system:
 *                 type: string
 *                 description: Optional system prompt to set context/behavior
 *                 example: "You are a helpful assistant."
 *     responses:
 *       200:
 *         description: Streamed completion response
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-sent events stream of completion chunks
 *       400:
 *         description: Missing or invalid prompt
 *       502:
 *         description: Provider request failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: object
 *                   properties:
 *                     provider:
 *                       type: string
 *                     baseUrl:
 *                       type: string
 *                     model:
 *                       type: string
 *                     message:
 *                       type: string
 *       500:
 *         description: Internal server error
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const prompt: string | undefined = body?.prompt
    const modelId: string | undefined = body?.model
    const system: string | undefined = body?.system

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { getModelHandle, providerModelId, providerName, baseUrl } = await ProviderService.resolveAiProvider({ model: modelId })

    let result
    try {
      result = streamText({
        model: getModelHandle(providerModelId),
        ...(system ? { system } : {}),
        prompt,
      })
    } catch (err: any) {
      return new Response(JSON.stringify({
        error: 'Provider request failed',
        details: {
          provider: providerName,
          baseUrl,
          model: providerModelId,
          message: String(err?.message || 'Unknown error').slice(0, 500),
        }
      }), { status: 502, headers: { 'Content-Type': 'application/json' } })
    }

    // Stream back in a format consumable by @ai-sdk/react useCompletion
    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error('POST /api/v1/chat/completions error:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate completion' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}


