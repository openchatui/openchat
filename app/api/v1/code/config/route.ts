import { NextResponse } from 'next/server'
import { getCodeConfigFromDb } from '@/lib/db/code.db'

/**
 * @swagger
 * /api/v1/code/config:
 *   get:
 *     tags: [Admin]
 *     summary: Get code interpreter configuration
 *     responses:
 *       200:
 *         description: Current code interpreter configuration
 *       500:
 *         description: Failed to fetch code config
 */
export async function GET() {
  try {
    const cfg = await getCodeConfigFromDb()
    return NextResponse.json({ code: cfg })
  } catch (error) {
    console.error('GET /api/v1/code/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch code config' }, { status: 500 })
  }
}


