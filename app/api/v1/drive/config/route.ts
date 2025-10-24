import { NextResponse } from 'next/server'
import { getDriveConfigFromDb } from '@/lib/db/drive.db'

/**
 * @swagger
 * /api/v1/drive/config:
 *   get:
 *     tags: [Admin]
 *     summary: Get drive configuration
 *     responses:
 *       200:
 *         description: Current drive configuration
 *       500:
 *         description: Failed to fetch drive config
 */
export async function GET() {
  try {
    const cfg = await getDriveConfigFromDb()
    return NextResponse.json({ drive: cfg })
  } catch (error) {
    console.error('GET /api/v1/drive/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch drive config' }, { status: 500 })
  }
}


