import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { fetchToken, isOwnerOrAdmin, isSameOrigin } from '@/lib/auth/authz'
import { z } from 'zod'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * @swagger
 * /api/users/{id}/settings/pinned:
 *   get:
 *     tags: [Users]
 *     summary: Get a user's pinned model ids
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
 *         description: Pinned models retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to retrieve pinned models
 *   put:
 *     tags: [Users]
 *     summary: Set a user's pinned model ids
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
 *               modelIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Pinned models updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to update pinned models
 */
// authz helpers are imported from '@/lib'

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
    const user = await db.user.findUnique({ where: { id }, select: { settings: true } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const settings = (user.settings || {}) as Record<string, unknown>
    const uiRaw = isPlainObject(settings.ui) ? (settings.ui as Record<string, unknown>) : {}
    const pinnedRaw = (uiRaw as Record<string, unknown>)['pinned_models']
    const pinned = Array.isArray(pinnedRaw)
      ? pinnedRaw.filter((v): v is string => typeof v === 'string')
      : []
    return NextResponse.json({ ui: { pinned_models: pinned } })
  } catch (error) {
    console.error('GET /api/users/[id]/settings/pinned error:', error)
    return NextResponse.json({ error: 'Failed to retrieve pinned models' }, { status: 500 })
  }
}

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
    const user = await db.user.findUnique({ where: { id }, select: { settings: true } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const Body = z.object({
      modelIds: z.array(z.string()).max(200).optional(),
      pinned_models: z.array(z.string()).max(200).optional()
    })
    const parsed = Body.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: 'modelIds must be an array of strings' }, { status: 400 })
    }
    const input = parsed.data
    const modelIds: string[] = Array.isArray(input.modelIds)
      ? input.modelIds
      : (Array.isArray(input.pinned_models) ? input.pinned_models : [])

    if (!Array.isArray(modelIds) || !modelIds.every((v) => typeof v === 'string')) {
      return NextResponse.json({ error: 'modelIds must be an array of strings' }, { status: 400 })
    }

    const currentSettings = (user?.settings || {}) as Record<string, unknown>
    const currentUi = isPlainObject(currentSettings.ui) ? (currentSettings.ui as Record<string, unknown>) : {}

    const existingPinnedRaw = (currentUi as Record<string, unknown>)['pinned_models']
    const existingPinned = Array.isArray(existingPinnedRaw)
      ? existingPinnedRaw.filter((v): v is string => typeof v === 'string')
      : []
    const merged = Array.from(new Set([...
      existingPinned,
      ...modelIds
    ]))

    const nextSettings = {
      ...currentSettings,
      ui: {
        ...currentUi,
        pinned_models: merged,
      },
    }

    await db.user.update({ where: { id }, data: { settings: nextSettings } })

    return NextResponse.json({ ui: { pinned_models: merged } })
  } catch (error) {
    console.error('PUT /api/users/[id]/settings/pinned error:', error)
    return NextResponse.json({ error: 'Failed to update pinned models' }, { status: 500 })
  }
}


