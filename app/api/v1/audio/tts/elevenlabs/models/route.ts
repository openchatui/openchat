import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/v1/audio/tts/elevenlabs/models
export async function GET(_request: NextRequest) {
  try {
    // Resolve API key from config first, fallback to env
    let apiKey: string | null = null
    try {
      const cfg = await (db as any).config.findUnique({ where: { id: 1 } })
      const data = (cfg?.data || {}) as any
      const keys: string[] = Array.isArray(data?.connections?.elevenlabs?.api_keys)
        ? data.connections.elevenlabs.api_keys
        : []
      apiKey = typeof keys[0] === 'string' ? keys[0] : null
    } catch {}
    if (!apiKey) apiKey = process.env.ELEVENLABS_API_KEY || null
    if (!apiKey) return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 400 })

    const endpoint = 'https://api.elevenlabs.io/v1/models'
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
      return NextResponse.json({ error: 'Failed to fetch ElevenLabs models', details: text }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/v1/audio/tts/elevenlabs/models error:', error)
    return NextResponse.json({ error: 'Failed to fetch ElevenLabs models' }, { status: 500 })
  }
}


