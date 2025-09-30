import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { syncUserGoogleDrive } from '@/lib/server/drive/providers/google-drive.service'

export async function POST() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await syncUserGoogleDrive(userId)
    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'Failed to sync' }, { status: 500 })
  }
}


