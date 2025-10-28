import { NextRequest, NextResponse } from 'next/server'
import { getWebsearchConfigData, updateWebsearchConfigData } from '@/lib/db/websearch.db'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge(target: any, source: any): any {
  if (Array.isArray(target) && Array.isArray(source)) return source
  if (isPlainObject(target) && isPlainObject(source)) {
    const result: Record<string, unknown> = { ...target }
    for (const key of Object.keys(source)) {
      const sVal = (source as any)[key]
      const tVal = (target as any)[key]
      result[key] = isPlainObject(tVal) && isPlainObject(sVal) ? deepMerge(tVal, sVal) : sVal
    }
    return result
  }
  return source
}

/**
 * @swagger
 * /api/v1/websearch/config/update:
 *   put:
 *     tags: [Web Tool]
 *     summary: Update websearch configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               websearch:
 *                 type: object
 *                 properties:
 *                   ENABLED:
 *                     type: boolean
 *                   ENABLED_BY_DEFAULT:
 *                     type: boolean
 *                   SYSTEM_PROMPT:
 *                     type: string
 *                   PROVIDER:
 *                     type: string
 *                     enum: [browserless, googlepse]
 *                   googlepse:
 *                     type: object
 *                     properties:
 *                       apiKey:
 *                         type: string
 *                       engineId:
 *                         type: string
 *                       resultCount:
 *                         type: integer
 *                       domainFilters:
 *                         type: array
 *                         items:
 *                           type: string
 *                   browserless:
 *                     type: object
 *                     properties:
 *                       apiKey:
 *                         type: string
 *     responses:
 *       200:
 *         description: Updated subset of websearch config
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Failed to update websearch config
 */
// PUT /api/v1/websearch/config/update - upsert websearch config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const incoming = (body?.websearch ?? {}) as Record<string, unknown>

    if (!isPlainObject(incoming)) {
      return NextResponse.json({ error: 'Invalid websearch payload' }, { status: 400 })
    }

    // Normalize accepted keys
    const acceptedKeys = ['ENABLED', 'ENABLED_BY_DEFAULT', 'SYSTEM_PROMPT', 'PROVIDER', 'googlepse', 'browserless'] as const
    const filtered: Record<string, unknown> = {}
    for (const key of acceptedKeys) {
      if (key in incoming) filtered[key] = (incoming as any)[key]
    }

    const currentData = (await getWebsearchConfigData()) as Record<string, unknown>
    const currentWebSearch = isPlainObject((currentData as any).websearch) ? (currentData as any).websearch : {}

    // Merge only the websearch key while preserving other top-level keys in data
    const mergedWebSearch = deepMerge(currentWebSearch, filtered)
    const nextData = { ...currentData, websearch: mergedWebSearch }

    const data = (await updateWebsearchConfigData(nextData)) as any
    const websearch = isPlainObject(data.websearch) ? (data.websearch as any) : {}
    return NextResponse.json({
      websearch: {
        ENABLED_BY_DEFAULT: Boolean(websearch.ENABLED_BY_DEFAULT),
        SYSTEM_PROMPT: typeof websearch.SYSTEM_PROMPT === 'string' ? websearch.SYSTEM_PROMPT : null,
      },
    })
  } catch (error) {
    console.error('PUT /api/v1/websearch/config/update error:', error)
    return NextResponse.json({ error: 'Failed to update websearch config' }, { status: 500 })
  }
}



