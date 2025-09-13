import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import db from '@/lib/db'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// PUT /api/users/user/settings/models/pin - set pinned model ids at settings.ui.pinned_models
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as any
    const modelIds: string[] = Array.isArray(body?.modelIds)
      ? body.modelIds
      : (Array.isArray(body?.pinned_models) ? body.pinned_models : [])

    if (!Array.isArray(modelIds) || !modelIds.every((v) => typeof v === 'string')) {
      return NextResponse.json({ error: 'modelIds must be an array of strings' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { settings: true } })
    const currentSettings = (user?.settings || {}) as Record<string, unknown>
    const currentUi = isPlainObject(currentSettings.ui) ? (currentSettings.ui as Record<string, unknown>) : {}

    const existingPinned = Array.isArray((currentUi as any).pinned_models)
      ? ((currentUi as any).pinned_models as any[]).filter((v) => typeof v === 'string')
      : []
    const merged = Array.from(new Set([...
      existingPinned,
      ...modelIds
    ]))

    const nextSettings = {
      ...currentSettings,
      ui: {
        ...currentUi,
        pinned_models: merged,
      },
    }

    await db.user.update({ where: { id: session.user.id }, data: { settings: nextSettings } })

    return NextResponse.json({ ui: { pinned_models: merged } })
  } catch (error) {
    console.error('PUT /api/users/user/settings/models/pin error:', error)
    return NextResponse.json({ error: 'Failed to update pinned models' }, { status: 500 })
  }
}


