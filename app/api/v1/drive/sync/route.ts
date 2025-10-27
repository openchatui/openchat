import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { syncUserGoogleDrive } from '@/lib/modules/drive/providers/google-drive.service'

/**
 * @swagger
 * /api/v1/drive/sync:
 *   post:
 *     tags: [Connections]
 *     summary: Trigger Google Drive sync for a user
 *     description: Uses the authenticated session when available, or an internal secret header with explicit userId.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Required only when using the internal secret header.
 *     responses:
 *       200:
 *         description: Sync started/result
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to sync
 */
export async function POST(req: Request) {
  try {
    const internalSecret = process.env.INTERNAL_API_SECRET
    const internalHeader = req.headers.get('x-internal-auth')

    // Prefer authenticated session; fallback to internal secret header with explicit userId
    const session = await auth()
    const sessionUserId = session?.user?.id

    let userId = sessionUserId
    if (!userId && internalSecret && internalHeader === internalSecret) {
      const body = await req.json().catch(() => ({})) as any
      if (body && typeof body.userId === 'string' && body.userId.length > 0) {
        userId = body.userId
      }
    }

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await syncUserGoogleDrive(userId)
    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'Failed to sync' }, { status: 500 })
  }
}


