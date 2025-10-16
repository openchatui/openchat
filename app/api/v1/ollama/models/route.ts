import { NextRequest, NextResponse } from 'next/server'

/**
 * @swagger
 * /api/v1/ollama/models:
 *   get:
 *     tags: [Ollama]
 *     summary: List local Ollama models
 *     parameters:
 *       - in: query
 *         name: baseUrl
 *         required: false
 *         schema:
 *           type: string
 *         description: Base URL of the Ollama server (default http://localhost:11434)
 *       - in: query
 *         name: apiKey
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of local models
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to list models
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const base = (searchParams.get('baseUrl') || 'http://localhost:11434').trim()
    const apiKey = searchParams.get('apiKey')

    // Validate URL format
    try { new URL(base) } catch {
      return NextResponse.json(
        { error: 'Invalid baseUrl format' },
        { status: 400 }
      )
    }

    const url = base.replace(/\/+$/, '') + '/api/tags'
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
    if (apiKey && apiKey.trim() !== '') {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`
    }

    const response = await fetch(url, { method: 'GET', headers, cache: 'no-store' })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Ollama /api/tags failed: ${response.status} ${response.statusText}`, data },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error listing Ollama models:', error)
    return NextResponse.json(
      { error: 'Failed to list models' },
      { status: 500 }
    )
  }
}


