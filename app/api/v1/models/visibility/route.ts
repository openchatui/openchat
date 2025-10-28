import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/lib/auth"
import { batchUpdateModelsVisibilityForUser } from '@/lib/db/models.db'

export const runtime = 'nodejs'

/**
 * @swagger
 * /api/v1/models/visibility:
 *   post:
 *     tags: [Models]
 *     summary: Batch update models visibility
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     hidden:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Updated models
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to update models
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({} as any))
    const updates = Array.isArray(body?.updates) ? body.updates.filter((u: any) => u && typeof u.id === 'string' && typeof u.hidden === 'boolean') : []
    if (updates.length === 0) return NextResponse.json({ models: [] })

    const models = await batchUpdateModelsVisibilityForUser(userId, updates)
    return NextResponse.json({ models, count: models.length })
  } catch (error: any) {
    console.error('POST /models/visibility/batch error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to update models' }, { status: 500 })
  }
}


