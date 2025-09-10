export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { revokeApiKey } from '@/lib/apiKeys'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Key ID required' }, { status: 400 })

    const ok = await revokeApiKey(userId, id)
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Failed to revoke key' }, { status: 500 })
  }
}


