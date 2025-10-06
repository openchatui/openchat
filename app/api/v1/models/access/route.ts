import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { ApiAuthService } from '@/lib/api'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await ApiAuthService.authenticateRequest(request.headers)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { groupId, selection } = body || {}
    if (!groupId || !selection || typeof selection !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const modelIds = Object.keys(selection)
    if (modelIds.length === 0) return NextResponse.json({ ok: true })

    const models = await db.model.findMany({ where: { id: { in: modelIds } } })
    await Promise.all(models.map(async (m: any) => {
      const sel = selection[m.id] || {}
      const current: any = m.accessControl || { read: { group_ids: [], user_ids: [] }, write: { group_ids: [], user_ids: [] } }
      const next = {
        read: {
          group_ids: Array.isArray(current.read?.group_ids) ? [...current.read.group_ids] : [],
          user_ids: Array.isArray(current.read?.user_ids) ? [...current.read.user_ids] : [],
        },
        write: {
          group_ids: Array.isArray(current.write?.group_ids) ? [...current.write.group_ids] : [],
          user_ids: Array.isArray(current.write?.user_ids) ? [...current.write.user_ids] : [],
        },
      }

      const ensureIn = (arr: string[], idToAdd: string) => Array.from(new Set([...(arr || []), idToAdd]))
      const ensureOut = (arr: string[], idToRemove: string) => (arr || []).filter((x) => x !== idToRemove)

      if (sel.read) next.read.group_ids = ensureIn(next.read.group_ids, groupId)
      else next.read.group_ids = ensureOut(next.read.group_ids, groupId)

      if (sel.write) next.write.group_ids = ensureIn(next.write.group_ids, groupId)
      else next.write.group_ids = ensureOut(next.write.group_ids, groupId)

      const changed = JSON.stringify(current) !== JSON.stringify(next)
      if (changed) {
        await db.model.update({ where: { id: m.id }, data: { accessControl: next } })
      }
    }))

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Error updating model access', error)
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 })
  }
}


