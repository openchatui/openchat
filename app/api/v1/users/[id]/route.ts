import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { fetchToken, isAdminToken, isSameOrigin } from '@/lib'
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


const reverseRoleMap = {
  user: 'USER',
  admin: 'ADMIN',
  moderator: 'USER'
} as const

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Admin]
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

    const Body = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(['user', 'admin', 'moderator']).default('user'),
      password: z.string().min(8).optional().or(z.literal('')),
      groupIds: z.array(z.string()).optional(),
    })
    const { name, email, role, password, groupIds } = Body.parse(await request.json())

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (email && email !== existing.email) {
      const emailExists = await db.user.findUnique({ where: { email } })
      if (emailExists) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = {
      name,
      email,
      role: reverseRoleMap[role as keyof typeof reverseRoleMap] || 'USER',
    }

    if (password && password.trim()) {
      const bcrypt = await import('bcryptjs')
      updateData.hashedPassword = await bcrypt.hash(password, 12)
    }

    await db.user.update({ where: { id }, data: updateData })

    if (Array.isArray(groupIds)) {
      const groups = await db.group.findMany({ select: { id: true, userIds: true } })
      await Promise.all(groups.map(async (g) => {
        const currentRaw = g.userIds
        const current: string[] = Array.isArray(currentRaw)
          ? currentRaw.filter((v): v is string => typeof v === 'string')
          : []
        const shouldHave = groupIds.includes(g.id)
        const hasNow = current.includes(id)
        let next = current
        if (shouldHave && !hasNow) next = Array.from(new Set([...current, id]))
        if (!shouldHave && hasNow) next = current.filter((x) => x !== id)
        const changed = next.length !== current.length || next.some((v, i) => v !== current[i])
        if (changed) {
          await db.group.update({ where: { id: g.id }, data: { userIds: next } })
        }
      }))
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}


