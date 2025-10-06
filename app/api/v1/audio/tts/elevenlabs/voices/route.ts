import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/v1/audio/tts/elevenlabs/voices
export async function GET(request: NextRequest) {
  try {
    // Resolve API key from config first, fallback to env
    let apiKey: string | null = null
    try {
      const cfg = await db.config.findUnique({ where: { id: 1 } })
      const data = (cfg?.data || {}) as any
      const keys: string[] = Array.isArray(data?.connections?.elevenlabs?.api_keys)
        ? data.connections.elevenlabs.api_keys
        : []
      apiKey = typeof keys[0] === 'string' ? keys[0] : null
    } catch {}
    if (!apiKey) apiKey = process.env.ELEVENLABS_API_KEY || null
    if (!apiKey) return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 400 })

    // Forward allowed query params
    const inParams = request.nextUrl.searchParams
    const allowedParams = new URLSearchParams()
    const passKeys = [
      'next_page_token',
      'page_size',
      'search',
      'sort',
      'sort_direction',
      'voice_type',
      'category',
      'fine_tuning_state',
      'collection_id',
      'include_total_count',
      'voice_ids',
    ]
    for (const key of passKeys) {
      const val = inParams.get(key)
      if (val !== null) allowedParams.set(key, val)
    }

    const endpoint = `https://api.elevenlabs.io/v2/voices${allowedParams.toString() ? `?${allowedParams.toString()}` : ''}`

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: 'Failed to fetch ElevenLabs voices', details: text }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/v1/audio/tts/elevenlabs/voices error:', error)
    return NextResponse.json({ error: 'Failed to fetch ElevenLabs voices' }, { status: 500 })
  }
}


