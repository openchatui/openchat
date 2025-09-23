import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { User, UpdateUserData } from '@/lib/server/user-management/user.types'

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
 * /api/users/update:
 *   put:
 *     tags: [Admin]
 *     summary: Update a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *               userGroup:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to update user
 */
// PUT /api/users/update - Update user
export async function PUT(request: NextRequest) {
  try {

    const body: UpdateUserData = await request.json()
    const { id, name, email, role, userGroup, password, image } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // If email is being changed, check if it's already taken
    if (email && email !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email is already taken by another user' },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = reverseRoleMap[role as keyof typeof reverseRoleMap] || 'USER'
    if (image !== undefined) updateData.image = image

    // Handle password update
    if (password && password.trim()) {
      const bcrypt = await import('bcryptjs')
      updateData.hashedPassword = await bcrypt.hash(password, 12)
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          select: {
            providerAccountId: true,
            provider: true
          }
        },
        sessions: {
          select: {
            expires: true
          },
          orderBy: {
            expires: 'desc'
          },
          take: 1
        }
      }
    })

    // Transform response to match frontend format
    const lastSession = updatedUser.sessions[0]
    const lastActive = lastSession ? new Date(lastSession.expires) : undefined

    const oauthAccount = updatedUser.accounts.find(account =>
      account.provider !== 'credentials'
    )

    const user: User = {
      id: updatedUser.id,
      name: updatedUser.name || 'Unknown User',
      email: updatedUser.email,
      role: roleMap[updatedUser.role as keyof typeof roleMap] || 'user',
      userGroup: userGroup || 'default',
      profilePicture: updatedUser.image || undefined,
      lastActive: lastActive?.toISOString(),
      createdAt: updatedUser.createdAt.toISOString(),
      oauthId: oauthAccount?.providerAccountId,
      updatedAt: updatedUser.updatedAt.toISOString()
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}
