import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { fetchToken, getUserIdFromToken } from '@/lib/security/authz'

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the current authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch current user
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = await fetchToken(request)
    const userId = getUserIdFromToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('GET /api/users/me error:', error)
    return NextResponse.json({ error: 'Failed to fetch current user' }, { status: 500 })
  }
}


