import { NextRequest } from 'next/server'
import { PyodideManager } from '@/lib/modules/tools/pyodide/pyodide.service'

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


