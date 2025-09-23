import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'
import { getEffectivePermissionsForUser } from '@/lib/server'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickOpenAIConnection(connections: any): { baseUrl: string; apiKey: string } | null {
  const openai = isPlainObject(connections?.openai) ? connections.openai as any : {}
  const urls: string[] = Array.isArray(openai.api_base_urls) ? openai.api_base_urls : []
  const keys: string[] = Array.isArray(openai.api_keys) ? openai.api_keys : []
  let idx = urls.findIndex(u => typeof u === 'string' && u.toLowerCase().includes('openai.com'))
  if (idx < 0) idx = urls.findIndex(u => typeof u === 'string' && /openai/i.test(u))
  if (idx < 0) idx = urls.length > 0 ? 0 : -1
  if (idx < 0) return null
  const baseUrl = urls[idx]
  const apiKey = keys[idx]
  if (typeof baseUrl !== 'string' || typeof apiKey !== 'string') return null
  return { baseUrl, apiKey }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const eff = await getEffectivePermissionsForUser(userId)
    if (!eff.chat.stt) return NextResponse.json({ error: 'STT not enabled' }, { status: 403 })

    const form = await request.formData()
    const file = form.get('file') as File | null
    const model = (form.get('model') as string | null) || 'whisper-1'
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    const config = await (db as any).config.findUnique({ where: { id: 1 } })
    const allData = (config?.data || {}) as Record<string, unknown>
    const connections = isPlainObject((allData as any).connections) ? (allData as any).connections : {}
    const picked = pickOpenAIConnection(connections)
    if (!picked) {
      return NextResponse.json({ error: 'OpenAI connection not configured' }, { status: 400 })
    }

    const endpoint = `${picked.baseUrl.replace(/\/$/, '')}/audio/transcriptions`

    const upstream = new FormData()
    upstream.append('file', file, (file as any).name || 'audio.webm')
    upstream.append('model', model)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${picked.apiKey}`,
      },
      body: upstream,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: 'OpenAI transcription failed', details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('POST /api/v1/audio/stt/openai error:', error)
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 })
  }
}


