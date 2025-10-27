import { NextResponse } from 'next/server'
import { auth } from "@/lib/auth"
import { listActiveModelsLightReadableByUser } from '@/lib/db/models.db'

export const runtime = 'nodejs'

/**
 * @swagger
 * /api/v1/models/active:
 *   get:
 *     tags: [Models]
 *     summary: List active models with minimal fields
 *     responses:
 *       200:
 *         description: List of models
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to fetch models
 */
export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const models = await listActiveModelsLightReadableByUser(userId)
    return NextResponse.json({ models, count: models.length })
  } catch (error: any) {
    console.error('GET /models/active error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to fetch models' }, { status: 500 })
  }
}


