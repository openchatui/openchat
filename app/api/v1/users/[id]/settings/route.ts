import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { fetchToken, getUserIdFromToken, isOwnerOrAdmin, isSameOrigin } from '@/lib'
import type { JWT } from 'next-auth/jwt'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

/**
 * @swagger
 * /api/users/{id}/settings:
 *   get:
 *     tags: [Users]
 *     summary: Get a user's settings by ID
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
 *         description: User settings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to retrieve settings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Re-derive identity and allow owner or admin
    const token = await fetchToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const Params = z.object({ id: z.string().min(1) })
    const { id } = Params.parse(await params)
    if (!isOwnerOrAdmin(token, id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const user = await db.user.findUnique({
      where: { id },
      select: { settings: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user.settings || {})
  } catch (error) {
    console.error('Error retrieving user settings by id:', error)
    return NextResponse.json({ error: 'Failed to retrieve settings' }, { status: 500 })
  }
}

// PUT /api/users/{id}/settings - Update user's settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // CSRF: same-origin check
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Re-derive identity and allow owner or admin
    const token = await fetchToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const Params = z.object({ id: z.string().min(1) })
    const { id } = Params.parse(await params)
    if (!isOwnerOrAdmin(token, id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate body (must be a non-null JSON object)
    let settingsRaw: unknown
    try {
      settingsRaw = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    if (typeof settingsRaw !== 'object' || settingsRaw === null || Array.isArray(settingsRaw)) {
      return NextResponse.json(
        { error: 'Settings must be a valid JSON object' },
        { status: 400 }
      )
    }
    const settings = settingsRaw as Record<string, unknown>

    const updatedUser = await db.user.update({
      where: { id },
      data: { settings: settings as Prisma.InputJsonValue },
      select: { settings: true, updatedAt: true }
    })

    return NextResponse.json({
      settings: updatedUser.settings,
      updatedAt: updatedUser.updatedAt.toISOString()
    })
  } catch (error) {
    console.error('Error updating user settings by id:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}


