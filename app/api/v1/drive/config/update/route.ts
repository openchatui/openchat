import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateDriveConfigInDb } from '@/lib/db/drive.db'

const WorkspaceProviderSchema = z.enum(['local', 'aws', 'azure'])
const BodySchema = z.object({
  drive: z.object({
    enabled: z.boolean().optional(),
    workspace: z.object({
      enabled: z.boolean().optional(),
      provider: WorkspaceProviderSchema.optional(),
    }).optional(),
    user: z.object({
      enabled: z.boolean().optional(),
    }).optional(),
  })
})

/**
 * @swagger
 * /api/v1/drive/config/update:
 *   put:
 *     tags: [Admin]
 *     summary: Update drive configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               drive:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   workspace:
 *                     type: object
 *                     properties:
 *                       enabled:
 *                         type: boolean
 *                       provider:
 *                         type: string
 *                         enum: [local, aws, azure]
 *                   user:
 *                     type: object
 *                     properties:
 *                       enabled:
 *                         type: boolean
 *     responses:
 *       200:
 *         description: Updated subset of drive config
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Failed to update drive config
 */
export async function PUT(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid drive payload' }, { status: 400 })
    }
    const incoming = parsed.data.drive
    const next = await updateDriveConfigInDb({
      enabled: incoming.enabled,
      workspace: incoming.workspace,
      user: incoming.user,
    })
    return NextResponse.json({ drive: next })
  } catch (error) {
    console.error('PUT /api/v1/drive/config/update error:', error)
    return NextResponse.json({ error: 'Failed to update drive config' }, { status: 500 })
  }
}


