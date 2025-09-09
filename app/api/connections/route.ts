import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

// GET /api/connections - List all connections
export async function GET() {
  try {
    const connections = await db.connection.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(connections)
  } catch (error) {
    console.error('Error fetching connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}

// POST /api/connections - Create new connection(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle single connection or array of connections
    const connectionsData = Array.isArray(body) ? body : [body]
    
    // Validate required fields
    for (const connection of connectionsData) {
      if (!connection.baseUrl || !connection.type) {
        return NextResponse.json(
          { error: 'Base URL and type are required' },
          { status: 400 }
        )
      }
      // API Key is required for OpenAI connections
      if (connection.type === 'openai-api' && !connection.apiKey) {
        return NextResponse.json(
          { error: 'API Key is required for OpenAI connections' },
          { status: 400 }
        )
      }
    }

    // Create connections
    const createdConnections = await db.connection.createMany({
      data: connectionsData.map(conn => ({
        type: conn.type,
        baseUrl: conn.baseUrl.trim(),
        apiKey: conn.apiKey ? conn.apiKey.trim() : null
      }))
    })

    // Fetch the created connections to return them
    const newConnections = await db.connection.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: createdConnections.count
    })

    return NextResponse.json(newConnections, { status: 201 })
  } catch (error) {
    console.error('Error creating connections:', error)
    return NextResponse.json(
      { error: 'Failed to create connections' },
      { status: 500 }
    )
  }
}
