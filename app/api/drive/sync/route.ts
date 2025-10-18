import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { syncUserGoogleDrive } from '@/lib/modules/drive/providers/google-drive.service'

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


