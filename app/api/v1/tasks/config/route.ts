import { NextResponse } from 'next/server'
import db from '@/lib/db'

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
 * /api/v1/tasks/config:
 *   get:
 *     tags: [Tasks]
 *     summary: Get tasks configuration
 *     responses:
 *       200:
 *         description: Current tasks configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: object
 *                   properties:
 *                     TASK_MODEL:
 *                       type: string
 *                       nullable: true
 *                     TITLE_PROMPT:
 *                       type: string
 *                       nullable: true
 *                     TAGS_PROMPT:
 *                       type: string
 *                       nullable: true
 *       500:
 *         description: Failed to fetch tasks config
 */
// GET /api/v1/tasks/config - returns tasks config
export async function GET() {
  try {
    let config = await db.config.findUnique({ where: { id: 1 } })
    if (!config) {
      config = await db.config.create({ data: { id: 1, data: {} } })
    }

    const data = (config.data || {}) as any
    const tasks = isPlainObject(data.tasks) ? (data.tasks as any) : {}
    const TASK_MODEL = tasks.TASK_MODEL ?? null
    const TITLE_PROMPT = tasks.TITLE_PROMPT ?? null
    const TAGS_PROMPT = tasks.TAGS_PROMPT ?? null

    return NextResponse.json({
      tasks: {
        TASK_MODEL,
        TITLE_PROMPT,
        TAGS_PROMPT,
      },
    })
  } catch (error) {
    console.error('GET /api/v1/tasks/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks config' }, { status: 500 })
  }
}


