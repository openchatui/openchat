import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'
import { getEffectivePermissionsForUser } from '@/lib/modules/access-control/permissions.service';

/**
 * @swagger
 * /api/v1/audio/stt/deepgram:
 *   post:
 *     tags: [Audio]
 *     summary: Speech-to-Text using Deepgram (proxy)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               model:
 *                 type: string
 *                 default: nova-2
 *     responses:
 *       200:
 *         description: Transcription result
 *       400:
 *         description: Missing file or Deepgram not configured
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: STT not enabled
 *       500:
 *         description: Failed to transcribe audio
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const eff = await getEffectivePermissionsForUser(userId)
    if (!eff.chat.stt) return NextResponse.json({ error: 'STT not enabled' }, { status: 403 })

    const form = await request.formData()
    const file = form.get('file') as File | null
    const model = (form.get('model') as string | null) || 'nova-2'
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    // Resolve API key from config first, fallback to env
    let apiKey: string | null = null
    try {
      const cfg = await db.config.findUnique({ where: { id: 1 } })
      const data = (cfg?.data || {}) as any
      const keys: string[] = Array.isArray(data?.connections?.deepgram?.api_keys)
        ? data.connections.deepgram.api_keys
        : []
      apiKey = typeof keys[0] === 'string' ? keys[0] : null
    } catch {}
    if (!apiKey) apiKey = process.env.DEEPGRAM_API_KEY || null
    if (!apiKey) return NextResponse.json({ error: 'Deepgram API key not configured' }, { status: 400 })

    const endpoint = `https://api.deepgram.com/v1/listen?model=${encodeURIComponent(model)}`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': (file as any).type || 'audio/webm'
      },
      body: file as any,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: 'Deepgram transcription failed', details: text }, { status: res.status })
    }

    const data = await res.json()
    // Extract transcript text
    const text: string = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
    return NextResponse.json({ text, raw: data })
  } catch (error) {
    console.error('POST /api/v1/audio/stt/deepgram error:', error)
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 })
  }
}


