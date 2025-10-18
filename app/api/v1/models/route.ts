import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { ApiAuthService } from '@/lib/auth/api-auth.service'
import { getEffectivePermissionsForUser } from '@/lib/modules/access-control/permissions.service'
import { filterModelsReadableByUser } from '@/lib/modules/access-control/model-access.service'

/**
 * @swagger
 * /api/v1/models:
 *   get:
 *     tags: [Models]
 *     summary: List models for the authenticated user
 *     responses:
 *       200:
 *         description: List of models
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch models
 */

export async function GET(request: NextRequest) {
  try {
    const { userId } = await ApiAuthService.authenticateRequest(request.headers)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eff = await getEffectivePermissionsForUser(userId)
    if (!eff.workspace.models) {
      return NextResponse.json({ error: 'Models access disabled' }, { status: 403 })
    }

    // Load recent models and filter by access control
    const modelsRaw = await db.model.findMany({
      orderBy: { updatedAt: 'desc' },
    })
    const models = await filterModelsReadableByUser(userId, modelsRaw)

    return NextResponse.json({
      models: models,
      count: models.length,
    })
  } catch (error: any) {
    console.error('Error fetching models:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to fetch models' }, { status: 500 })
  }
}