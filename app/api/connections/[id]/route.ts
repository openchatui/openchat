import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/connections/[id] - Get single connection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const connection = await db.connection.findUnique({
      where: {
        id: id
      }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(connection)
  } catch (error) {
    console.error('Error fetching connection:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connection' },
      { status: 500 }
    )
  }
}

// PUT /api/connections/[id] - Update connection
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate required fields
    if (!body.baseUrl || !body.type) {
      return NextResponse.json(
        { error: 'Base URL and type are required' },
        { status: 400 }
      )
    }
    // API Key is required for OpenAI connections
    if (body.type === 'openai-api' && !body.apiKey) {
      return NextResponse.json(
        { error: 'API Key is required for OpenAI connections' },
        { status: 400 }
      )
    }

    // Check if connection exists
    const existingConnection = await db.connection.findUnique({
      where: { id: id }
    })

    if (!existingConnection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Update connection
    const updatedConnection = await db.connection.update({
      where: {
        id: id
      },
      data: {
        type: body.type,
        baseUrl: body.baseUrl.trim(),
        apiKey: body.apiKey ? body.apiKey.trim() : null
      }
    })

    return NextResponse.json(updatedConnection)
  } catch (error) {
    console.error('Error updating connection:', error)
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    )
  }
}

// DELETE /api/connections/[id] - Delete connection
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    // Check if connection exists
    const existingConnection = await db.connection.findUnique({
      where: { id: id }
    })

    if (!existingConnection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Delete connection
    await db.connection.delete({
      where: {
        id: id
      }
    })

    return NextResponse.json({ message: 'Connection deleted successfully' })
  } catch (error) {
    console.error('Error deleting connection:', error)
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    )
  }
}
