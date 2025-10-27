import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getGoogleDriveAbout } from '@/lib/modules/drive/providers/google-drive.service'

/**
 * @swagger
 * /api/v1/drive/about:
 *   get:
 *     tags: [Drive]
 *     summary: Get Google Drive account information for the authenticated user
 *     description: Returns basic information about the connected Google Drive account (storage, user, capabilities) for the current user.
 *     responses:
 *       200:
 *         description: Drive account info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch drive info
 */
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

