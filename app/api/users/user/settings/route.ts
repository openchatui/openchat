import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/lib/auth"
import db from '@/lib/db'

/**
 * @swagger
 * /api/users/user/settings:
 *   get:
 *     tags: [Users]
 *     summary: Get current user's settings
 *     responses:
 *       200:
 *         description: User settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to retrieve settings
 *   put:
 *     tags: [Users]
 *     summary: Update current user's settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Settings object to store (e.g., {"ui":{"models":["gpt-4.1"]}})
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to update settings
 */

// GET /api/users/user/settings - Get current user's settings
export async function GET() {
  try {
    // Get the current session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user settings from database
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Return settings (default to empty object if null)
    return NextResponse.json(user.settings || {})
  } catch (error) {
    console.error('Error retrieving user settings:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve settings' },
      { status: 500 }
    )
  }
}

// PUT /api/users/user/settings - Update current user's settings
export async function PUT(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    let settings: any
    try {
      settings = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate that settings is an object
    if (typeof settings !== 'object' || settings === null) {
      return NextResponse.json(
        { error: 'Settings must be a valid JSON object' },
        { status: 400 }
      )
    }

    // Update user settings in database
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { settings },
      select: { settings: true, updatedAt: true }
    })

    return NextResponse.json({
      settings: updatedUser.settings,
      updatedAt: updatedUser.updatedAt.toISOString()
    })
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

// POST /api/users/user/settings - Alias for PUT (upsert functionality)
export async function POST(request: NextRequest) {
  return PUT(request)
}
