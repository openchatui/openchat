import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { fetchToken, getUserIdFromToken, isSameOrigin } from '@/lib/auth/authz'

const ParamsSchema = z.object({ id: z.string().min(1) })

/**
 * @swagger
 * /api/v1/drive/file/{id}/restore:
 *   patch:
 *     tags: [Drive]
 *     summary: Restore a file from Trash
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
 *         description: File restored
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

    const { id } = ParamsSchema.parse(await ctx.params)

    const existing = await db.file.findFirst({ where: { id, userId } })
    if (!existing) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const meta = (existing.meta ?? {}) as Record<string, unknown>
    const previousParentId: string | null = (meta?.restore_id as string | undefined) ?? null
    const nextMeta: Record<string, unknown> = { ...meta }
    delete (nextMeta as any).restore_id

    const nowSec = Math.floor(Date.now() / 1000)
    // Sanitize to Prisma JSON input type
    const sanitizedMeta: Prisma.InputJsonValue = JSON.parse(JSON.stringify(nextMeta)) as Prisma.InputJsonValue
    const res = await db.file.updateMany({
      where: { id, userId },
      data: { parentId: previousParentId, meta: sanitizedMeta, updatedAt: nowSec },
    })
    if (res.count === 0) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    revalidatePath('/drive')
    revalidatePath('/drive/trash')
    return NextResponse.json({ ok: true, parentId: previousParentId })
  } catch (error) {
    console.error('PATCH /api/v1/drive/file/{id}/restore error:', error)
    return NextResponse.json({ error: 'Failed to restore file' }, { status: 500 })
  }
}


