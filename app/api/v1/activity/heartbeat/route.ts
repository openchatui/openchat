import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { randomUUID } from 'crypto'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as any
    const tabId = typeof body?.tabId === 'string' && body.tabId.length > 0 ? body.tabId : null
    const path = typeof body?.path === 'string' ? body.path : null
    const userAgent = typeof body?.userAgent === 'string' ? body.userAgent : req.headers.get('user-agent')

    if (!tabId) {
      return NextResponse.json({ ok: false, error: 'Missing tabId' }, { status: 400 })
    }

    const now = new Date()

    // Use SQL upsert to avoid relying on generated Prisma types for the new model
    await db.$executeRawUnsafe(
      `INSERT INTO tab_activity (id, user_id, session_id, tab_id, last_seen_at, path, user_agent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, tab_id) DO UPDATE SET last_seen_at = excluded.last_seen_at, path = excluded.path, user_agent = excluded.user_agent, updated_at = excluded.updated_at`,
      randomUUID(),
      userId,
      null,
      tabId,
      now.toISOString(),
      path,
      userAgent || null,
      now.toISOString(),
      now.toISOString(),
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}


