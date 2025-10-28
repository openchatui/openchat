import { NextResponse } from 'next/server'
import { getConnectionsConfig } from '@/lib/db/connections.db'

/**
 * @swagger
 * /api/v1/connections/config:
 *   get:
 *     tags: [Connections]
 *     summary: Get connections configuration
 *     responses:
 *       200:
 *         description: Connections config
 *       500:
 *         description: Failed to fetch connections config
 */
export async function GET() {
  try {
    const shaped = await getConnectionsConfig()
    return NextResponse.json(shaped)
  } catch (error) {
    console.error('GET /api/v1/connections/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch connections config' }, { status: 500 })
  }
}


