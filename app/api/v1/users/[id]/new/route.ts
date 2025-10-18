import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { fetchToken, isAdminToken, isSameOrigin } from '@/lib'
import { z } from 'zod'

const reverseRoleMap = {
  user: 'USER',
  admin: 'ADMIN',
  moderator: 'USER'
} as const

/**
 * @swagger
 * /api/users/{id}/new:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new user with a specific ID
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
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    // Validate params and body
    const Params = z.object({ id: z.string().min(1) })
    const Body = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(8).optional(),
      role: z.enum(['user', 'admin']).default('user')
    })
    const { id } = Params.parse(await params)
    const { name, email, password, role = 'user' } = Body.parse(await request.json())

    const existingById = await db.user.findUnique({ where: { id } })
    if (existingById) {
      return NextResponse.json({ error: 'User with this id already exists' }, { status: 409 })
    }

    const existingByEmail = await db.user.findUnique({ where: { email } })
    if (existingByEmail) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    let hashedPassword = ''
    if (password) {
      const bcrypt = await import('bcryptjs')
      hashedPassword = await bcrypt.hash(password, 12)
    }

    const created = await db.user.create({
      data: {
        id,
        name,
        email,
        hashedPassword,
        role: reverseRoleMap[role as keyof typeof reverseRoleMap] || 'USER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      id: created.id,
      name: created.name || 'Unknown User',
      email: created.email,
      role,
      userGroup: 'default',
      profilePicture: created.image || undefined,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user by id:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}


