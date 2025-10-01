import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getGoogleDriveAbout } from '@/lib/server/drive/providers/google-drive.service'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const aboutInfo = await getGoogleDriveAbout(session.user.id)
    return NextResponse.json(aboutInfo)
  } catch (error: any) {
    console.error('Error fetching Google Drive info:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Failed to fetch drive info' },
      { status: 500 }
    )
  }
}

