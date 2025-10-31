import { NextRequest, NextResponse } from 'next/server'
import { listUsersForAdmin, createUserAdmin, findUserByEmail } from '@/lib/db/users.db'
import type { User } from '@/types/user.types'
import { fetchToken, isAdminToken, isSameOrigin } from '@/lib/auth/authz'
import { z } from 'zod'

// Role mapping between database enum and frontend types
const roleMap = {
  USER: 'user',
  ADMIN: 'admin'
} as const

const reverseRoleMap = {
  user: 'USER',
  admin: 'ADMIN',
  moderator: 'USER' // Map moderator to USER for now until we add it to the enum
} as const

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Failed to fetch users
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: User already exists
 *       500:
 *         description: Failed to create user
 */
// GET /api/users - List all users
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Re-derive identity and enforce admin role
    const token = await fetchToken(request)
    console.log('[API /api/v1/users] Token check:', {
      hasToken: !!token,
      isAdmin: token ? isAdminToken(token) : false,
      role: token ? (token as Record<string, unknown>).role : undefined,
    })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdminToken(token)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Fetch all users with their accounts (for OAuth ID)
    const dbUsers = await listUsersForAdmin()

    // Transform the data to match our frontend User interface
    const MAX_AGE_DAYS = 30
    const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
    const users: User[] = dbUsers.map(dbUser => {
      // NextAuth stores `expires` in the future; infer last activity as (expires - maxAge)
      const lastSession = dbUser.sessions[0]
      const expiresAt = lastSession ? new Date(lastSession.expires) : undefined
      const inferredLastActive = expiresAt ? new Date(expiresAt.getTime() - MAX_AGE_MS) : undefined

      // Get OAuth ID from accounts (prefer OAuth providers)
      const oauthAccount = dbUser.accounts.find(account =>
        account.provider !== 'credentials'
      )

      return {
        id: dbUser.id,
        name: dbUser.name || 'Unknown User',
        email: dbUser.email,
        role: roleMap[dbUser.role as keyof typeof roleMap] || 'user',
        userGroup: 'default', // Default for now, can be extended later
        profilePicture: dbUser.image || undefined,
        lastActive: inferredLastActive?.toISOString(),
        createdAt: dbUser.createdAt.toISOString(),
        oauthId: oauthAccount?.providerAccountId,
        updatedAt: dbUser.updatedAt.toISOString()
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create new user (optional, for future use)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CSRF: same-origin check
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Re-derive identity and enforce admin role
    const token = await fetchToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdminToken(token)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate input
    const Body = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8).optional(),
      role: z.enum(['user', 'admin']).default('user'),
      userGroup: z.enum(['default', 'premium', 'enterprise']).default('default')
    })
    const { name, email, password, role = 'user', userGroup = 'default' } = Body.parse(await request.json())

    // Check if user already exists
    const existingUser = await findUserByEmail(email)

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password if provided
    let hashedPassword = ''
    if (password) {
      const bcrypt = await import('bcryptjs')
      hashedPassword = await bcrypt.hash(password, 12)
    }

    // Create user
    const newUser = await createUserAdmin({
      name,
      email,
      hashedPassword,
      role: reverseRoleMap[role as keyof typeof reverseRoleMap] || 'USER'
    })

    // Transform response to match frontend format
    const user: User = {
      id: newUser.id,
      name: newUser.name || 'Unknown User',
      email: newUser.email,
      role: roleMap[newUser.role as keyof typeof roleMap] || 'user',
      userGroup: userGroup as User['userGroup'],
      profilePicture: newUser.image || undefined,
      createdAt: newUser.createdAt.toISOString(),
      updatedAt: newUser.updatedAt.toISOString()
    }

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
