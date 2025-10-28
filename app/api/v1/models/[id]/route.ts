import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/lib/auth"
import { getModelOwnedByUser, updateModelForUser } from '@/lib/db/models.db'

/**
 * @swagger
 * /api/v1/models/{id}:
 *   get:
 *     tags: [Models]
 *     summary: Get a model by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Model
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Failed to fetch model
 *   put:
 *     tags: [Models]
 *     summary: Update a model
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *               meta:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated model
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Failed to update model
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await params
    if (!rawId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 })
    }
    
    // Decode the URL-encoded model ID
    const id = decodeURIComponent(rawId)

    const body = await request.json()
    const { isActive, meta } = body

    // First check if the model exists and belongs to the user
    const existingModel = await getModelOwnedByUser(userId, id)

    if (!existingModel) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    const updatedModel = await updateModelForUser(userId, id, { isActive, meta })

    return NextResponse.json(updatedModel)
  } catch (error: any) {
    console.error('Error updating model:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to update model' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await params
    if (!rawId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 })
    }
    
    // Decode the URL-encoded model ID
    const id = decodeURIComponent(rawId)

    const model = await getModelOwnedByUser(userId, id)

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    return NextResponse.json(model)
  } catch (error: any) {
    console.error('Error fetching model:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to fetch model' }, { status: 500 })
  }
}
