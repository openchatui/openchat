import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateCodeConfigInDb } from '@/lib/db/code.db'

const CodeInterpreterSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.enum(['pyodide', 'jupyter']).optional(),
})

/**
 * @swagger
 * /api/v1/code/config/update:
 *   put:
 *     tags: [Code Tool]
 *     summary: Update code interpreter configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   provider:
 *                     type: string
 *                     enum: [pyodide, jupyter]
 *     responses:
 *       200:
 *         description: Updated subset of code interpreter config
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Failed to update code config
 */
export async function PUT(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({})) as any
    const parsed = CodeInterpreterSchema.safeParse(raw?.code || {})
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid code payload' }, { status: 400 })
    }

    await updateCodeConfigInDb(parsed.data)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PUT /api/v1/code/config/update error:', error)
    return NextResponse.json({ error: 'Failed to update code config' }, { status: 500 })
  }
}


