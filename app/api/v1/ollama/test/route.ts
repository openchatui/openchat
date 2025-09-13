import { NextRequest, NextResponse } from 'next/server'

/**
 * @swagger
 * /api/v1/ollama/test:
 *   post:
 *     tags: [Ollama]
 *     summary: Test connectivity to an Ollama server
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               baseUrl:
 *                 type: string
 *               apiKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connection test result
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to test connection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body?.baseUrl) {
      return NextResponse.json(
        { error: 'Base URL is required' },
        { status: 400 }
      )
    }

    const baseUrl = String(body.baseUrl).trim()

    // Validate URL format
    try {
      new URL(baseUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Test the connection
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'OpenChat-OllamaConnectionTest/1.0'
      }
      if (body.apiKey && String(body.apiKey).trim() !== '') {
        headers['Authorization'] = `Bearer ${String(body.apiKey).trim()}`
      }

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      return NextResponse.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: baseUrl,
        responseTime: Date.now()
      })

    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'Connection timeout (10s)',
          url: baseUrl
        })
      }

      return NextResponse.json({
        success: false,
        error: error?.message || 'Connection failed',
        url: baseUrl
      })
    }

  } catch (error) {
    console.error('Error testing Ollama connection:', error)
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    )
  }
}


