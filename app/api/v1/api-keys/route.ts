export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ApiKeyService } from '@/lib/api'

/**
 * @swagger
 * /api/v1/api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: List API keys for the authenticated user
 *     description: Returns all API keys that belong to the currently authenticated user.
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 keys:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to list keys
 *   post:
 *     tags: [API Keys]
 *     summary: Create a new API key
 *     description: Creates a new API key for the authenticated user.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keyName:
 *                 type: string
 *                 maxLength: 100
 *     responses:
 *       201:
 *         description: API key created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to create key
 */
export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const keys = await ApiKeyService.listApiKeys(userId)
    return NextResponse.json({ keys })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Failed to list keys' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({})) as { keyName?: string }
    const keyName = (body?.keyName ?? 'Default Key').toString().slice(0, 100)

    const created = await ApiKeyService.createApiKey(userId, keyName)
    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/v1/api-keys error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to create key' }, { status: 500 })
  }
}


