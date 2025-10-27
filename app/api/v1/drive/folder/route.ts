import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createFolderRecord } from '@/lib/modules/drive'
import { fetchToken, getUserIdFromToken, isSameOrigin } from '@/lib/auth/authz'

export const runtime = 'nodejs'

const CreateFolderSchema = z.object({
  name: z.string().min(1).max(128),
  parent: z.string().optional(),
})

/**
 * @swagger
 * /api/v1/drive/folder:
 *   post:
 *     tags: [Tools]
 *     summary: Create a folder
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 128
 *               parent:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Folder created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const token = await fetchToken(request)
    const userId = getUserIdFromToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = await request.json().catch(() => ({}))
    const parsed = CreateFolderSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { name, parent } = parsed.data
    const created = await createFolderRecord(userId, name, parent && parent.length > 0 ? parent : null)

    // Revalidate common views
    revalidatePath('/drive')
    if (parent && parent.length > 0) {
      revalidatePath(`/drive/folder/${encodeURIComponent(parent)}`)
    }

    return NextResponse.json({ id: created.id }, { status: 201 })
  } catch (error) {
    console.error('POST /api/v1/drive/folder error:', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}


