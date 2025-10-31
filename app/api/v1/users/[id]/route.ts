import { NextRequest, NextResponse } from 'next/server'
import { findUserWithDetailsById, updateUserBasic, findUserById, updateUserGroups, findUserByEmail, updateUserImage } from '@/lib/db/users.db'
import { fetchToken, isAdminToken, isSameOrigin } from '@/lib/auth/authz'
import { z } from 'zod'

// Role mapping between database enum and frontend types
const roleMap = {
  USER: 'user',
  ADMIN: 'admin'
} as const

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users]
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

    const dbUser = await findUserWithDetailsById(id)

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const MAX_AGE_DAYS = 30
    const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
    const lastSession = dbUser.sessions[0]
    const expiresAt = lastSession ? new Date(lastSession.expires) : undefined
    const lastActive = expiresAt ? new Date(expiresAt.getTime() - MAX_AGE_MS) : undefined
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


const reverseRoleMap = {
  user: 'USER',
  admin: 'ADMIN',
  moderator: 'USER'
} as const

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update a user's profile (name, email, role, password) and optional group memberships
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *               role:
 *                 type: string
 *                 enum: [user, admin, moderator]
 *               password:
 *                 type: string
 *                 description: Optional new password (min 8 chars)
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               image:
 *                 type: string
 *                 description: Optional profile image URL. When provided alone, only the image is updated.
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 *       500:
 *         description: Failed to update user
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const token = await fetchToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdminToken(token)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const Params = z.object({ id: z.string().min(1) })
    const { id } = Params.parse(await params)

    const BodyBasic = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(['user', 'admin', 'moderator']).default('user'),
      password: z.string().min(8).optional().or(z.literal('')),
      groupIds: z.array(z.string()).optional(),
    })
    const BodyImage = z.object({
      image: z.string().min(1),
    })
    const raw = await request.json()
    const basicParsed = BodyBasic.safeParse(raw)
    const imageParsed = BodyImage.safeParse(raw)

    const existing = await findUserById(id)
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (basicParsed.success && basicParsed.data.email && basicParsed.data.email !== existing.email) {
      const emailExists = await findUserByEmail(basicParsed.data.email)
      if (emailExists) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
      }
    }

    // If only image is being updated
    if (imageParsed.success && !basicParsed.success) {
      await updateUserImage(id, imageParsed.data.image)
      const refreshed = await findUserWithDetailsById(id)
      if (!refreshed) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const MAX_AGE_DAYS = 30
      const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
      const lastSession = refreshed.sessions[0]
      const expiresAt = lastSession ? new Date(lastSession.expires) : undefined
      const lastActive = expiresAt ? new Date(expiresAt.getTime() - MAX_AGE_MS) : undefined
      const oauthAccount = refreshed.accounts.find(a => a.provider !== 'credentials')
      const user = {
        id: refreshed.id,
        name: refreshed.name || 'Unknown User',
        email: refreshed.email,
        role: roleMap[refreshed.role as keyof typeof roleMap] || 'user',
        userGroup: 'default',
        profilePicture: refreshed.image || undefined,
        lastActive: lastActive?.toISOString(),
        createdAt: refreshed.createdAt.toISOString(),
        oauthId: oauthAccount?.providerAccountId,
        updatedAt: refreshed.updatedAt.toISOString()
      }
      return NextResponse.json(user)
    }

    // Full/basic update flow
    if (basicParsed.success) {
      const { name, email, role, password, groupIds } = basicParsed.data
      const updateData: { name: string; email: string; role: 'USER'|'ADMIN'; hashedPassword?: string } = {
        name,
        email,
        role: (reverseRoleMap[role as keyof typeof reverseRoleMap] || 'USER') as 'USER'|'ADMIN',
      }
      if (password && password.trim()) {
        const bcrypt = await import('bcryptjs')
        updateData.hashedPassword = await bcrypt.hash(password, 12)
      }
      await updateUserBasic(id, updateData)

      if (Array.isArray(groupIds)) {
        await updateUserGroups(id, groupIds)
      }

      const refreshed = await findUserWithDetailsById(id)
      if (!refreshed) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const MAX_AGE_DAYS = 30
      const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
      const lastSession = refreshed.sessions[0]
      const expiresAt = lastSession ? new Date(lastSession.expires) : undefined
      const lastActive = expiresAt ? new Date(expiresAt.getTime() - MAX_AGE_MS) : undefined
      const oauthAccount = refreshed.accounts.find(a => a.provider !== 'credentials')
      const user = {
        id: refreshed.id,
        name: refreshed.name || 'Unknown User',
        email: refreshed.email,
        role: roleMap[refreshed.role as keyof typeof roleMap] || 'user',
        userGroup: 'default',
        profilePicture: refreshed.image || undefined,
        lastActive: lastActive?.toISOString(),
        createdAt: refreshed.createdAt.toISOString(),
        oauthId: oauthAccount?.providerAccountId,
        updatedAt: refreshed.updatedAt.toISOString()
      }
      return NextResponse.json(user)
    }

    // Neither schema matched
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}


