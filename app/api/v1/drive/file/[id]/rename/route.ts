import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { fetchToken, getUserIdFromToken, isSameOrigin } from '@/lib/auth/authz'

const BodySchema = z.object({ filename: z.string().min(1).max(255) })

/**
 * @swagger
 * /api/v1/drive/file/{id}/rename:
 *   patch:
 *     tags: [Drive]
 *     summary: Rename a file
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
 *               filename:
 *                 type: string
 *     responses:
 *       200:
 *         description: File renamed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const token = await fetchToken(request)
    const userId = getUserIdFromToken(token)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await ctx.params
    const raw = await request.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const nowSec = Math.floor(Date.now() / 1000)
    const res = await db.file.updateMany({
      where: { id, userId },
      data: { filename: parsed.data.filename, updatedAt: nowSec },
    })
    if (res.count === 0) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    revalidatePath('/drive')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/v1/drive/file/{id}/rename error:', error)
    return NextResponse.json({ error: 'Failed to rename file' }, { status: 500 })
  }
}


