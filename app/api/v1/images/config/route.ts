import { NextResponse } from 'next/server'
import { getImageConfigFromDb } from '@/lib/db/image.db'

/**
 * @swagger
 * /api/v1/images/config:
 *   get:
 *     tags: [Admin]
 *     summary: Get image configuration
 *     responses:
 *       200:
 *         description: Current image configuration
 *       500:
 *         description: Failed to fetch image config
 */
export async function GET() {
  try {
    const cfg = await getImageConfigFromDb()
    return NextResponse.json({ image: cfg })
  } catch (error) {
    console.error('GET /api/v1/images/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch image config' }, { status: 500 })
  }
}


