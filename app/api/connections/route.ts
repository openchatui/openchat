import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

function computeProviderFromUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl.trim())
    // Ollama default port detection
    if (u.port === '11434' || u.hostname.includes('11434')) return 'ollama'
    const host = u.hostname.toLowerCase()
    // Return the registrable root label if possible, else hostname
    const parts = host.split('.').filter(Boolean)
    if (parts.length >= 2) return parts[parts.length - 2]
    return parts[0] || host
  } catch {
    return null
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueMergeArrays<T>(base: T[] | undefined, adds: T[]): T[] {
  const set = new Set([...(Array.isArray(base) ? base : []), ...adds])
  return Array.from(set)
}

/**
 * @swagger
 * /api/connections:
 *   get:
 *     tags: [Connections]
 *     summary: List all connections
 *     responses:
 *       200:
 *         description: List of connections
 *       500:
 *         description: Failed to fetch connections
 *   post:
 *     tags: [Connections]
 *     summary: Create one or more connections
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/Connection'
 *               - type: array
 *                 items:
 *                   $ref: '#/components/schemas/Connection'
 *     responses:
 *       201:
 *         description: Connections created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to create connections
 */
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
      // API Key is required for OpenAI connections (legacy rule)
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
        type: (conn.type || '').trim(),
        baseUrl: conn.baseUrl.trim(),
        apiKey: conn.apiKey ? conn.apiKey.trim() : null,
        provider: computeProviderFromUrl(conn.baseUrl) || null,
      }))
    })

    // Fetch the created connections to return them
    const newConnections = await db.connection.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: createdConnections.count
    })

    // Also merge created endpoints into Config.data.connections without touching other keys
    try {
      const openaiBaseAdds: string[] = connectionsData
        .filter((c: any) => c.type === 'openai-api' && typeof c.baseUrl === 'string')
        .map((c: any) => String(c.baseUrl).trim())
        .filter(Boolean)
      const openaiKeyAdds: string[] = connectionsData
        .filter((c: any) => c.type === 'openai-api' && typeof c.apiKey === 'string')
        .map((c: any) => String(c.apiKey).trim())
        .filter(Boolean)
      const ollamaBaseAdds: string[] = connectionsData
        .filter((c: any) => c.type === 'ollama' && typeof c.baseUrl === 'string')
        .map((c: any) => String(c.baseUrl).trim())
        .filter(Boolean)

      const hasAnyAdds = openaiBaseAdds.length > 0 || openaiKeyAdds.length > 0 || ollamaBaseAdds.length > 0
      if (hasAnyAdds) {
        const existing = await db.config.findUnique({ where: { id: 1 } })
        const currentData = (existing?.data || {}) as Record<string, unknown>
        const currentConnections = isPlainObject((currentData as any).connections) ? (currentData as any).connections as any : {}
        const currentOpenai = isPlainObject(currentConnections.openai) ? currentConnections.openai as any : {}
        const currentOllama = isPlainObject(currentConnections.ollama) ? currentConnections.ollama as any : {}

        const nextOpenai = openaiBaseAdds.length > 0 || openaiKeyAdds.length > 0
          ? {
              enable: typeof currentOpenai.enable === 'boolean' ? (currentOpenai.enable || true) : true,
              api_base_urls: uniqueMergeArrays<string>(currentOpenai.api_base_urls, openaiBaseAdds),
              api_keys: uniqueMergeArrays<string>(currentOpenai.api_keys, openaiKeyAdds),
              api_configs: isPlainObject(currentOpenai.api_configs) ? currentOpenai.api_configs : {},
            }
          : currentOpenai

        const nextOllama = ollamaBaseAdds.length > 0
          ? {
              enable: typeof currentOllama.enable === 'boolean' ? (currentOllama.enable || true) : true,
              base_urls: uniqueMergeArrays<string>(currentOllama.base_urls, ollamaBaseAdds),
              api_configs: isPlainObject(currentOllama.api_configs) ? currentOllama.api_configs : {},
            }
          : currentOllama

        const nextConnections: any = { ...currentConnections }
        if (openaiBaseAdds.length > 0 || openaiKeyAdds.length > 0) nextConnections.openai = nextOpenai
        if (ollamaBaseAdds.length > 0) nextConnections.ollama = nextOllama

        const nextData = { ...currentData, connections: nextConnections }

        if (existing) {
          await db.config.update({ where: { id: 1 }, data: { data: nextData } })
        } else {
          await db.config.create({ data: { id: 1, data: nextData } })
        }
      }
    } catch (cfgErr) {
      console.error('Warning: failed to update connections config after create:', cfgErr)
      // Do not fail the request if config sync fails
    }

    return NextResponse.json(newConnections, { status: 201 })
  } catch (error) {
    console.error('Error creating connections:', error)
    return NextResponse.json(
      { error: 'Failed to create connections' },
      { status: 500 }
    )
  }
}
