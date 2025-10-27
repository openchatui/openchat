import { NextRequest, NextResponse } from 'next/server'
import { getUserSettingsFromDb, updateUserSettingsInDb } from '@/lib/db/users.db'
import { fetchToken, isOwnerOrAdmin, isSameOrigin } from '@/lib/auth/authz'
import { z } from 'zod'

export const runtime = 'nodejs'

/**
 * @swagger
 * /api/v1/users/{id}/settings:
 *   get:
 *     tags: [Authentication]
 *     summary: Get user settings
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
 *         description: User settings
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 *   put:
 *     tags: [Authentication]
 *     summary: Update user settings
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
 *     responses:
 *       200:
 *         description: Updated settings
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const token = await fetchToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const Params = z.object({ id: z.string().min(1) })
    const { id } = Params.parse(await params)
    if (!isOwnerOrAdmin(token, id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const settings = await getUserSettingsFromDb(id)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error retrieving user settings:', error)
    return NextResponse.json({ error: 'Failed to retrieve settings' }, { status: 500 })
  }
}

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
    const Params = z.object({ id: z.string().min(1) })
    const { id } = Params.parse(await params)
    if (!isOwnerOrAdmin(token, id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let settingsRaw: unknown
    try {
      settingsRaw = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }
    if (typeof settingsRaw !== 'object' || settingsRaw === null || Array.isArray(settingsRaw)) {
      return NextResponse.json({ error: 'Settings must be a valid JSON object' }, { status: 400 })
    }
    const settings = settingsRaw as Record<string, unknown>

    const { settings: updatedSettings, updatedAt } = await updateUserSettingsInDb(id, settings)
    return NextResponse.json({ settings: updatedSettings, updatedAt })
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}


