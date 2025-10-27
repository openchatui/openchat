import { NextRequest, NextResponse } from 'next/server'
import { ApiAuthService } from '@/lib/auth/api-auth.service'
import { findModelsByIds, updateModelAccessControl } from '@/lib/db/models.db'

/**
 * @swagger
 * /api/v1/models/access:
 *   post:
 *     tags: [Models]
 *     summary: Update group access for models
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [groupId, selection]
 *             properties:
 *               groupId:
 *                 type: string
 *               selection:
 *                 type: object
 *                 additionalProperties:
 *                   type: object
 *                   properties:
 *                     read:
 *                       type: boolean
 *                     write:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Access updated
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed
 */
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

    const models = await findModelsByIds(modelIds)
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
      if (changed) await updateModelAccessControl(m.id, next as any)
    }))

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Error updating model access', error)
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 })
  }
}


