import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { auth } from '@/lib/auth'
import { isAuthEnabled } from '@/lib/auth/toggle'

export const runtime = 'nodejs'

/**
 * @swagger
 * /api/v1/activity/active-users:
 *   get:
 *     tags: [Admin]
 *     summary: List currently active users (last 30s)
 *     description: Returns PII in authenticated mode; in public mode without auth, returns an array of nulls equal to the count.
 *     responses:
 *       200:
 *         description: List of active users or count-only array
 *       401:
 *         description: Unauthorized (when auth required)
 *       500:
 *         description: Internal error
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    const requireAuth = isAuthEnabled()
    if (requireAuth && !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Allow all authenticated users to see the aggregate (adjust if needed)

    const cutoff = new Date(Date.now() - 30 * 1000)
    // Use a simple query that works across SQLite/Postgres by passing a JS Date
    const rows = await db.$queryRawUnsafe<any[]>(
      `SELECT u.id as id, u.name as name, u.email as email, u.image as image,
              CAST(COUNT(t.tab_id) AS INTEGER) as tabs,
              MAX(t.last_seen_at) as lastSeenAt
       FROM tab_activity t
       JOIN users u ON u.id = t.user_id
       WHERE t.last_seen_at > ?
       GROUP BY u.id, u.name, u.email, u.image
       ORDER BY lastSeenAt DESC`,
      cutoff.toISOString()
    )

    if (!requireAuth && !userId) {
      // Public mode: return count only via array length to avoid exposing PII
      return NextResponse.json({ users: Array(rows.length).fill(null) })
    }

    const users = rows.map((r: any) => ({
      id: String(r.id),
      name: r.name == null ? null : String(r.name),
      email: String(r.email),
      image: r.image == null ? null : String(r.image),
      tabs: Number(r.tabs),
      lastSeenAt: typeof r.lastSeenAt === 'string' ? r.lastSeenAt : new Date(r.lastSeenAt).toISOString(),
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Active users error:', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}


