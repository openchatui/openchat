import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { randomUUID } from 'crypto'
import { auth, AuthService } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * @swagger
 * /api/v1/activity/heartbeat:
 *   post:
 *     tags: [Admin]
 *     summary: Record a user heartbeat from a browser tab
 *     description: Records the latest activity for a user's tab. May return 204 when unauthenticated or in first-time setup.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tabId:
 *                 type: string
 *               path:
 *                 type: string
 *               userAgent:
 *                 type: string
 *     responses:
 *       200:
 *         description: Heartbeat recorded
 *       204:
 *         description: No content (unauthenticated or ignored)
 *       400:
 *         description: Missing tabId
 *       500:
 *         description: Internal error
 */
export async function POST(req: NextRequest) {
  try {
    // If no users exist yet (first-time setup), no-op to keep logs clean
    const firstUser = await AuthService.isFirstUser()
    if (firstUser) {
      return new Response(null, { status: 204 })
    }

    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      // Silently ignore heartbeats when unauthenticated
      return new Response(null, { status: 204 })
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
    // If foreign key or similar constraint fails (e.g., stale client), ignore quietly
    const message = String((error as any)?.message || error || '')
    if (message.includes('FOREIGN KEY constraint failed') || message.includes('P2010')) {
      return new Response(null, { status: 204 })
    }
    console.error('Heartbeat error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}


