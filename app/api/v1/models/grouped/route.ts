import { NextResponse } from 'next/server'
import { auth } from "@/lib/auth"
import { listModelsReadableByUser } from '@/lib/db/models.db'

export const runtime = 'nodejs'

/**
 * @swagger
 * /api/v1/models/grouped:
 *   get:
 *     tags: [Models]
 *     summary: Group models by owner
 *     responses:
 *       200:
 *         description: Models grouped by owner
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

    const models = await listModelsReadableByUser(userId)
    const grouped = models.reduce((groups: Record<string, any[]>, model: any) => {
      const owner = (model?.meta as any)?.ownedBy || 'unknown'
      if (!groups[owner]) groups[owner] = []
      groups[owner].push(model)
      return groups
    }, {} as Record<string, any[]>)
    return NextResponse.json(grouped)
  } catch (error: any) {
    console.error('GET /models/grouped error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to fetch models' }, { status: 500 })
  }
}


