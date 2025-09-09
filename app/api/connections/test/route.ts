import { NextRequest, NextResponse } from 'next/server'

// POST /api/test-connection - Test connection to a given URL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.baseUrl) {
      return NextResponse.json(
        { error: 'Base URL is required' },
        { status: 400 }
      )
    }

    const baseUrl = body.baseUrl.trim()
    
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

      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PensareAI-ConnectionTest/1.0'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      return NextResponse.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: baseUrl,
        responseTime: Date.now() // Simple response time indicator
      })

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'Connection timeout (10s)',
          url: baseUrl
        })
      }

      return NextResponse.json({
        success: false,
        error: error.message || 'Connection failed',
        url: baseUrl
      })
    }

  } catch (error) {
    console.error('Error testing connection:', error)
    return NextResponse.json(
      { error: 'Failed to test connection' },
      { status: 500 }
    )
  }
}
