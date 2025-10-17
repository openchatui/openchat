import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { fetchToken, isAdminToken } from '@/lib/security/authz'
import { z } from 'zod'

// Role mapping between database enum and frontend types
const roleMap = {
  USER: 'user',
  ADMIN: 'admin'
} as const

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get a user by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to fetch user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Re-derive identity and enforce admin role
    const token = await fetchToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdminToken(token)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate path params
    const Params = z.object({ id: z.string().min(1) })
    const { id } = Params.parse(await params)

    const dbUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          select: { providerAccountId: true, provider: true }
        },
        sessions: {
          select: { expires: true },
          orderBy: { expires: 'desc' },
          take: 1
        }
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const lastSession = dbUser.sessions[0]
    const lastActive = lastSession ? new Date(lastSession.expires) : undefined
    const oauthAccount = dbUser.accounts.find(a => a.provider !== 'credentials')

    const user = {
      id: dbUser.id,
      name: dbUser.name || 'Unknown User',
      email: dbUser.email,
      role: roleMap[dbUser.role as keyof typeof roleMap] || 'user',
      userGroup: 'default',
      profilePicture: dbUser.image || undefined,
      lastActive: lastActive?.toISOString(),
      createdAt: dbUser.createdAt.toISOString(),
      oauthId: oauthAccount?.providerAccountId,
      updatedAt: dbUser.updatedAt.toISOString()
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user by id:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}


