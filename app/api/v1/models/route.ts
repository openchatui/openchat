import { NextRequest, NextResponse } from 'next/server'
import { ApiAuthService } from '@/lib/auth/api-auth.service'
import { listModelsReadableByUser } from '@/lib/db/models.db'

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

    const models = await listModelsReadableByUser(userId)

    return NextResponse.json({
      models: models,
      count: models.length,
    })
  } catch (error: any) {
    console.error('Error fetching models:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to fetch models' }, { status: 500 })
  }
}