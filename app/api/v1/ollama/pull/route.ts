import { NextRequest } from 'next/server'

/**
 * @swagger
 * /api/v1/ollama/pull:
 *   post:
 *     tags: [Ollama]
 *     summary: Pull (download) an Ollama model and stream progress
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [model]
 *             properties:
 *               model:
 *                 type: string
 *                 description: Model name (e.g. llama3:latest)
 *               baseUrl:
 *                 type: string
 *                 description: Base URL of the Ollama server (default http://localhost:11434)
 *               apiKey:
 *                 type: string
 *               insecure:
 *                 type: boolean
 *                 description: Allow insecure connections when pulling from a registry
 *               stream:
 *                 type: boolean
 *                 description: If false, returns a single JSON object; default true (stream)
 *     responses:
 *       200:
 *         description: Streams progress events
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to pull model
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      model?: string
      baseUrl?: string
      apiKey?: string
      insecure?: boolean
      stream?: boolean
    }

    const model = (body.model || '').trim()
    if (!model) {
      return new Response(JSON.stringify({ error: 'model is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      })
    }

    const base = (body.baseUrl || 'http://localhost:11434').trim()
    try { new URL(base) } catch {
      return new Response(JSON.stringify({ error: 'Invalid baseUrl format' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      })
    }

    const ollamaUrl = base.replace(/\/+$/, '') + '/api/pull'
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
    if (body.apiKey && body.apiKey.trim() !== '') {
      headers['Authorization'] = `Bearer ${body.apiKey.trim()}`
    }

    const payload: any = {
      model,
      stream: body.stream !== false, // default true (streaming)
    }
    if (typeof body.insecure === 'boolean') payload.insecure = body.insecure

    const upstream = await fetch(ollamaUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    // If streaming, proxy the readable stream through
    const contentType = upstream.headers.get('content-type') || 'application/json'
    const status = upstream.status
    const readable = upstream.body

    if (!readable) {
      const text = await upstream.text().catch(() => '')
      return new Response(text || JSON.stringify({ error: 'No response body from Ollama /api/pull' }), {
        status: status || 502,
        headers: { 'content-type': 'application/json' }
      })
    }

    // Pass-through streaming body and headers; callers can parse line-delimited JSON
    const respHeaders = new Headers({
      'content-type': contentType,
      'cache-control': 'no-store'
    })

    return new Response(readable, {
      status,
      headers: respHeaders,
    })
  } catch (error: any) {
    console.error('Error pulling Ollama model:', error)
    return new Response(JSON.stringify({ error: error?.message ?? 'Failed to pull model' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    })
  }
}


