import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addUnique<T>(base: T[] | undefined, adds: T[]): T[] {
  const set = new Set([...(Array.isArray(base) ? base : []), ...adds])
  return Array.from(set)
}

function removeValues<T>(base: T[] | undefined, removes: T[]): T[] {
  const removeSet = new Set(removes)
  return (Array.isArray(base) ? base : []).filter(item => !removeSet.has(item))
}

/**
 * @swagger
 * /api/connections/{id}:
 *   get:
 *     tags: [Connections]
 *     summary: Get a single connection
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection
 *       404:
 *         description: Not found
 *       500:
 *         description: Failed to fetch connection
 *   put:
 *     tags: [Connections]
 *     summary: Update a connection
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
 *             $ref: '#/components/schemas/Connection'
 *     responses:
 *       200:
 *         description: Updated connection
 *       400:
 *         description: Validation error
 *       404:
 *         description: Not found
 *       500:
 *         description: Failed to update connection
 *   delete:
 *     tags: [Connections]
 *     summary: Delete a connection
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection deleted successfully
 *       404:
 *         description: Not found
 *       500:
 *         description: Failed to delete connection
 */
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

    // Sync config JSON: remove old values, add new ones
    try {
      const prevType = existingConnection.type
      const prevBase = String(existingConnection.baseUrl || '').trim()
      const prevKey = existingConnection.apiKey ? String(existingConnection.apiKey).trim() : null
      const nextType = String(body.type || '').trim()
      const nextBase = String(body.baseUrl || '').trim()
      const nextKey = body.apiKey ? String(body.apiKey).trim() : null

      const existing = await db.config.findUnique({ where: { id: 1 } })
      const currentData = (existing?.data || {}) as Record<string, unknown>
      const currentConnections = isPlainObject((currentData as any).connections) ? ((currentData as any).connections as any) : {}
      const currentOpenai = isPlainObject(currentConnections.openai) ? (currentConnections.openai as any) : {}
      const currentOllama = isPlainObject(currentConnections.ollama) ? (currentConnections.ollama as any) : {}

      // Start with current arrays
      let openaiBase = removeValues<string>(currentOpenai.api_base_urls, [])
      let openaiKeys = removeValues<string>(currentOpenai.api_keys, [])
      let ollamaBase = removeValues<string>(currentOllama.base_urls, [])

      // Remove previous values based on previous type
      if (prevType === 'openai-api') {
        if (prevBase) openaiBase = removeValues(openaiBase, [prevBase])
        if (prevKey) openaiKeys = removeValues(openaiKeys, [prevKey])
      } else if (prevType === 'ollama') {
        if (prevBase) ollamaBase = removeValues(ollamaBase, [prevBase])
      }

      // Add new values based on new type
      if (nextType === 'openai-api') {
        if (nextBase) openaiBase = addUnique(openaiBase, [nextBase])
        if (nextKey) openaiKeys = addUnique(openaiKeys, [nextKey])
      } else if (nextType === 'ollama') {
        if (nextBase) ollamaBase = addUnique(ollamaBase, [nextBase])
      }

      const nextOpenai = (nextType === 'openai-api' || prevType === 'openai-api' || isPlainObject(currentOpenai))
        ? {
            enable: typeof currentOpenai.enable === 'boolean' ? (currentOpenai.enable || (openaiBase.length > 0 || openaiKeys.length > 0)) : (openaiBase.length > 0 || openaiKeys.length > 0),
            api_base_urls: openaiBase,
            api_keys: openaiKeys,
            api_configs: isPlainObject(currentOpenai.api_configs) ? currentOpenai.api_configs : {},
          }
        : undefined

      const nextOllama = (nextType === 'ollama' || prevType === 'ollama' || isPlainObject(currentOllama))
        ? {
            enable: typeof currentOllama.enable === 'boolean' ? (currentOllama.enable || (ollamaBase.length > 0)) : (ollamaBase.length > 0),
            base_urls: ollamaBase,
            api_configs: isPlainObject(currentOllama.api_configs) ? currentOllama.api_configs : {},
          }
        : undefined

      const nextConnections: any = { ...currentConnections }
      if (nextOpenai !== undefined) nextConnections.openai = nextOpenai
      if (nextOllama !== undefined) nextConnections.ollama = nextOllama

      const nextData = { ...currentData, connections: nextConnections }
      if (existing) {
        await db.config.update({ where: { id: 1 }, data: { data: nextData } })
      } else {
        await db.config.create({ data: { id: 1, data: nextData } })
      }
    } catch (cfgErr) {
      console.error('Warning: failed to sync connections config on update:', cfgErr)
    }

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

    // Sync config JSON: remove deleted values
    try {
      const prevType = existingConnection.type
      const prevBase = String(existingConnection.baseUrl || '').trim()
      const prevKey = existingConnection.apiKey ? String(existingConnection.apiKey).trim() : null

      const existing = await db.config.findUnique({ where: { id: 1 } })
      const currentData = (existing?.data || {}) as Record<string, unknown>
      const currentConnections = isPlainObject((currentData as any).connections) ? ((currentData as any).connections as any) : {}
      const currentOpenai = isPlainObject(currentConnections.openai) ? (currentConnections.openai as any) : {}
      const currentOllama = isPlainObject(currentConnections.ollama) ? (currentConnections.ollama as any) : {}

      let openaiBase = removeValues<string>(currentOpenai.api_base_urls, [])
      let openaiKeys = removeValues<string>(currentOpenai.api_keys, [])
      let ollamaBase = removeValues<string>(currentOllama.base_urls, [])

      if (prevType === 'openai-api') {
        if (prevBase) openaiBase = removeValues(openaiBase, [prevBase])
        if (prevKey) openaiKeys = removeValues(openaiKeys, [prevKey])
      } else if (prevType === 'ollama') {
        if (prevBase) ollamaBase = removeValues(ollamaBase, [prevBase])
      }

      const nextConnections: any = { ...currentConnections }
      if (isPlainObject(currentOpenai)) {
        nextConnections.openai = {
          enable: typeof currentOpenai.enable === 'boolean' ? currentOpenai.enable : (openaiBase.length > 0 || openaiKeys.length > 0),
          api_base_urls: openaiBase,
          api_keys: openaiKeys,
          api_configs: isPlainObject(currentOpenai.api_configs) ? currentOpenai.api_configs : {},
        }
      }
      if (isPlainObject(currentOllama)) {
        nextConnections.ollama = {
          enable: typeof currentOllama.enable === 'boolean' ? currentOllama.enable : (ollamaBase.length > 0),
          base_urls: ollamaBase,
          api_configs: isPlainObject(currentOllama.api_configs) ? currentOllama.api_configs : {},
        }
      }

      const nextData = { ...currentData, connections: nextConnections }
      if (existing) {
        await db.config.update({ where: { id: 1 }, data: { data: nextData } })
      } else {
        await db.config.create({ data: { id: 1, data: nextData } })
      }
    } catch (cfgErr) {
      console.error('Warning: failed to sync connections config on delete:', cfgErr)
    }

    return NextResponse.json({ message: 'Connection deleted successfully' })
  } catch (error) {
    console.error('Error deleting connection:', error)
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    )
  }
}
