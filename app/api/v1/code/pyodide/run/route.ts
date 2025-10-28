import { NextRequest } from 'next/server'
import { PyodideManager } from '@/lib/modules/tools/pyodide/pyodide.service'

/**
 * @swagger
 * /api/v1/code/pyodide/run:
 *   post:
 *     tags: [Code Tool]
 *     summary: Execute Python code using Pyodide
 *     description: Runs Python code in a sandboxed environment with optional context and package imports.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [script]
 *             properties:
 *               script:
 *                 type: string
 *                 description: Python code to execute
 *                 example: "import numpy as np\nprint(np.array([1,2,3]) * 2)"
 *               context:
 *                 type: object
 *                 description: Variables to inject into Python global scope
 *                 example: { "x": 42, "data": [1,2,3] }
 *               packages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Python packages to import (must be available in Pyodide)
 *                 example: ["numpy", "pandas"]
 *               warmup:
 *                 type: boolean
 *                 description: Whether to warm up the Pyodide runtime without executing code
 *     responses:
 *       200:
 *         description: Code execution result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 result:
 *                   type: object
 *                   description: Execution output and captured stdout/stderr
 *       400:
 *         description: Invalid request (missing script)
 *       500:
 *         description: Execution error or internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const script = typeof body?.script === 'string' ? body.script : ''
    const context = (body?.context && typeof body.context === 'object') ? body.context : {}
    const packages = Array.isArray(body?.packages) ? body.packages.filter((v: any) => typeof v === 'string') : undefined
    const warmup = Boolean(body?.warmup)

    if (!script || typeof script !== 'string') {
      return Response.json({ ok: false, message: 'script is required' }, { status: 400 })
    }

    const result = await PyodideManager.run({ script, context, packages, warmup })
    return Response.json({ ok: true, result })
  } catch (error: any) {
    return Response.json({ ok: false, message: String(error?.message || error) }, { status: 500 })
  }
}


