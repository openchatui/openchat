import { NextResponse } from 'next/server'
import { getConnectionsConfig } from '@/lib/db/connections'

export async function GET() {
  try {
    const shaped = await getConnectionsConfig()
    return NextResponse.json(shaped)
  } catch (error) {
    console.error('GET /api/v1/connections/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch connections config' }, { status: 500 })
  }
}


