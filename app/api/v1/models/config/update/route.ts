import { NextRequest, NextResponse } from 'next/server'
import { upsertModelsConfig } from '@/lib/db/config.db'

/**
 * @swagger
 * /api/v1/models/config/update:
 *   put:
 *     tags: [Models]
 *     summary: Upsert models configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               models:
 *                 type: object
 *                 properties:
 *                   order:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: Updated models config
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to update models config
 */
// PUT /api/v1/models/config/update - upsert models config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    try {
      const next = await upsertModelsConfig({ models: body?.models })
      return NextResponse.json(next)
    } catch (err: any) {
      return NextResponse.json({ error: err?.message ?? 'Invalid payload' }, { status: 400 })
    }
  } catch (error) {
    console.error('PUT /api/v1/models/config/update error:', error)
    return NextResponse.json({ error: 'Failed to update models config' }, { status: 500 })
  }
}


