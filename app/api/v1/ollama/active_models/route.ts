import { NextRequest, NextResponse } from 'next/server'
import * as ConnectionsRepo from '@/lib/db/connections.db'

/**
 * @swagger
 * /api/v1/ollama/active_models:
 *   get:
 *     tags: [Ollama]
 *     summary: List running Ollama models (processes)
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
 *         description: List of active models
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to fetch active models
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providerConn = await ConnectionsRepo.getProviderConnection('ollama').catch(() => null)
    const base = (searchParams.get('baseUrl') || providerConn?.baseUrl || 'http://localhost:11434').trim()
    const apiKey = searchParams.get('apiKey') || providerConn?.apiKey || undefined

    // Validate URL format
    try { new URL(base) } catch {
      return NextResponse.json(
        { error: 'Invalid baseUrl format' },
        { status: 400 }
      )
    }

    const url = base.replace(/\/+$/, '') + '/api/ps'
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
    if (apiKey && apiKey.trim() !== '') {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`
    }

    const response = await fetch(url, { method: 'GET', headers })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Ollama /api/ps failed: ${response.status} ${response.statusText}`, data },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching Ollama active models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active models' },
      { status: 500 }
    )
  }
}

/**
 * Also support POST with JSON body `{ baseUrl, apiKey }` for convenience
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { baseUrl?: string; apiKey?: string }
    const base = (body.baseUrl || 'http://localhost:11434').trim()
    const apiKey = body.apiKey

    try { new URL(base) } catch {
      return NextResponse.json(
        { error: 'Invalid baseUrl format' },
        { status: 400 }
      )
    }

    const url = base.replace(/\/+$/, '') + '/api/ps'
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
    if (apiKey && apiKey.trim() !== '') {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`
    }

    const response = await fetch(url, { method: 'GET', headers })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Ollama /api/ps failed: ${response.status} ${response.statusText}`, data },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching Ollama active models (POST):', error)
    return NextResponse.json(
      { error: 'Failed to fetch active models' },
      { status: 500 }
    )
  }
}


