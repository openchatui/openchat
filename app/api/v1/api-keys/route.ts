export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createApiKey, listApiKeys } from '@/lib/apiKeys'

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const keys = await listApiKeys(userId)
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

    const created = await createApiKey(userId, keyName)
    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/v1/api-keys error:', error)
    return NextResponse.json({ error: error?.message ?? 'Failed to create key' }, { status: 500 })
  }
}


