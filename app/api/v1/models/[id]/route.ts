import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/lib/auth"
import { getModelOwnedByUser, updateModelForUser } from '@/lib/db/models.db'
import { z } from 'zod'
import type { Model } from '@/types/model.types'

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
 *               params:
 *                 type: object
 *               name:
 *                 type: string
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

    const BodySchema = z.object({
      name: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
      meta: z.record(z.string(), z.unknown()).optional(),
      params: z.unknown().optional(),
    })

    const rawBody: unknown = await request.json()
    const parsed = BodySchema.parse(rawBody)

    // First check if the model exists and belongs to the user
    const existingModel = await getModelOwnedByUser(userId, id)

    if (!existingModel) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    const updatePayload: Partial<Pick<Model, 'name' | 'isActive' | 'meta' | 'params'>> = {}
    if (typeof parsed.name !== 'undefined') updatePayload.name = parsed.name
    if (typeof parsed.isActive !== 'undefined') updatePayload.isActive = parsed.isActive
    if (typeof parsed.meta !== 'undefined') updatePayload.meta = parsed.meta as unknown as Model['meta']
    if (typeof parsed.params !== 'undefined') updatePayload.params = parsed.params as unknown as Model['params']

    const updatedModel = await updateModelForUser(userId, id, updatePayload)

    return NextResponse.json(updatedModel)
  } catch (error: unknown) {
    console.error('Error updating model:', error)
    const message = error instanceof Error ? error.message : 'Failed to update model'
    return NextResponse.json({ error: message }, { status: 500 })
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
  } catch (error: unknown) {
    console.error('Error fetching model:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch model'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
