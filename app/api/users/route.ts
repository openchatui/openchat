import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import type { User } from '@/types/user'

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
 * /api/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users
 *     responses:
 *       200:
 *         description: List of users
 *       500:
 *         description: Failed to fetch users
 *   post:
 *     tags: [Admin]
 *     summary: Create a new user
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
 *       409:
 *         description: User already exists
 *       500:
 *         description: Failed to create user
 */
// GET /api/users - List all users
export async function GET() {
  try {
    // Fetch all users with their accounts (for OAuth ID)
    const dbUsers = await db.user.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to match our frontend User interface
    const users: User[] = dbUsers.map(dbUser => {
      // Find the most recent session expiration as lastActive
      const lastSession = dbUser.sessions[0]
      const lastActive = lastSession ? new Date(lastSession.expires) : undefined

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
        lastActive: lastActive?.toISOString(),
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
export async function POST(request: NextRequest) {
  try {

    const body = await request.json()
    const { name, email, password, role = 'user', userGroup = 'default' } = body

    // Validate required fields
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

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
    const newUser = await db.user.create({
      data: {
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
        updatedAt: true,
        accounts: {
          select: {
            providerAccountId: true
          }
        }
      }
    })

    // Transform response to match frontend format
    const user: User = {
      id: newUser.id,
      name: newUser.name || 'Unknown User',
      email: newUser.email,
      role: roleMap[newUser.role as keyof typeof roleMap] || 'user',
      userGroup,
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
