import { streamText } from 'ai'
import { ProviderService } from '@/lib/features/ai'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30
export const runtime = 'nodejs'

/**
 * POST /api/v1/chat/completions
 * Body: { prompt: string; model?: string; system?: string }
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


