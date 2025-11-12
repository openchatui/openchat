import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRootFolderId, getGoogleRootFolderId } from '@/lib/modules/drive'

export const runtime = 'nodejs'

/**
 * @swagger
 * /api/v1/drive/roots:
 *   get:
 *     tags: [Drive]
 *     summary: Get root folder ids for Local and Google Drive (current user)
 *     description: Returns the Local root id and, if connected, the Google Drive root id for the authenticated user.
 *     responses:
 *       200:
 *         description: Root ids fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 localRootId:
 *                   type: string
 *                   nullable: true
 *                 googleRootId:
 *                   type: string
 *                   nullable: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch roots
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id
    const [localRootId, googleRootId] = await Promise.all([
      getRootFolderId(userId).catch(() => null),
      getGoogleRootFolderId(userId).catch(() => null),
    ])
    return NextResponse.json({
      localRootId: localRootId || null,
      googleRootId: googleRootId || null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch roots' },
      { status: 500 }
    )
  }
}


