import { NextResponse } from 'next/server'
import { getAndShapeConfigAndPersistIfNeeded } from '@/lib/db/config.db'

/**
 * @swagger
 * /api/v1/models/config:
 *   get:
 *     tags: [Models]
 *     summary: Get models configuration
 *     responses:
 *       200:
 *         description: Models config
 *       500:
 *         description: Failed to fetch models config
 */
// GET /api/v1/models/config - returns models config, initializing if needed
export async function GET() {
  try {
    const shaped = await getAndShapeConfigAndPersistIfNeeded()
    return NextResponse.json(shaped)
  } catch (error) {
    console.error('GET /api/v1/models/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch models config' }, { status: 500 })
  }
}


