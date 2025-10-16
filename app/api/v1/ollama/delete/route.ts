import { NextRequest, NextResponse } from 'next/server'

/**
 * @swagger
 * /api/v1/ollama/delete:
 *   post:
 *     tags: [Ollama]
 *     summary: Delete a local Ollama model
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
 *     responses:
 *       200:
 *         description: Model deletion result
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to delete model
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      model?: string
      baseUrl?: string
      apiKey?: string
    }

    const model = (body.model || '').trim()
    if (!model) {
      return NextResponse.json({ error: 'model is required' }, { status: 400 })
    }

    const base = (body.baseUrl || 'http://localhost:11434').trim()
    try { new URL(base) } catch {
      return NextResponse.json({ error: 'Invalid baseUrl format' }, { status: 400 })
    }

    const url = base.replace(/\/+$/, '') + '/api/delete'
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
    if (body.apiKey && body.apiKey.trim() !== '') {
      headers['Authorization'] = `Bearer ${body.apiKey.trim()}`
    }

    const upstream = await fetch(url, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ model })
    })

    const data = await upstream.json().catch(() => null)
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Ollama /api/delete failed: ${upstream.status} ${upstream.statusText}`, data },
        { status: upstream.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error deleting Ollama model:', error)
    return NextResponse.json(
      { error: 'Failed to delete model' },
      { status: 500 }
    )
  }
}


