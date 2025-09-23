import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'
import { getEffectivePermissionsForUser } from '@/lib/server'
import { experimental_generateSpeech as generateSpeech } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

// If @ai-sdk/elevenlabs is installed, import dynamically to avoid bundling if unused
let createElevenLabs: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  createElevenLabs = require('@ai-sdk/elevenlabs').createElevenLabs
} catch {}

function getString(val: unknown): string | null {
  return typeof val === 'string' && val.length > 0 ? val : null
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const eff = await getEffectivePermissionsForUser(userId)
    if (!eff.chat.tts) return NextResponse.json({ error: 'TTS not enabled' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const text: string | null = getString(body?.text)
    if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 })

    // Load config
    const cfg = await (db as any).config.findUnique({ where: { id: 1 } })
    const data = (cfg?.data || {}) as any
    const audio = (data?.audio || {}) as any
    const connections = (data?.connections || {}) as any

    // Determine provider and credentials
    const tts = (audio?.tts || {}) as any
    const provider = typeof tts.provider === 'string' ? tts.provider : 'openai'

    if (provider === 'elevenlabs') {
      const keys: string[] = Array.isArray(connections?.elevenlabs?.api_keys)
        ? connections.elevenlabs.api_keys
        : []
      const apiKey = getString(keys[0]) || getString(process.env.ELEVENLABS_API_KEY)
      if (!apiKey) return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 400 })
      if (!createElevenLabs) return NextResponse.json({ error: 'ElevenLabs provider not available on server' }, { status: 500 })

      const elevenlabs = createElevenLabs({ apiKey })
      const modelId = getString(tts.modelId) || 'eleven_multilingual_v2'
      const voiceId = getString(tts.voiceId) || 'Rachel'
      const { audio: out } = await generateSpeech({
        model: elevenlabs.speech(modelId),
        text,
        voice: voiceId,
        outputFormat: 'mp3',
      })
      return NextResponse.json({ base64: out.base64, mimeType: 'audio/mpeg' })
    }

    // Default to OpenAI
    const openaiKeys: string[] = Array.isArray(connections?.openai?.api_keys)
      ? connections.openai.api_keys
      : []
    const openaiApiKey = getString(openaiKeys[0]) || getString(process.env.OPENAI_API_KEY)
    if (!openaiApiKey) return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 400 })

    const openai = createOpenAI({ apiKey: openaiApiKey })
    const { audio: out } = await generateSpeech({
      model: openai.speech('tts-1'),
      text,
      voice: 'alloy',
      outputFormat: 'mp3',
    })
    return NextResponse.json({ base64: out.base64, mimeType: 'audio/mpeg' })
  } catch (error) {
    console.error('POST /api/v1/audio/tts error:', error)
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 })
  }
}


