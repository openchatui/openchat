import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const runtime = 'nodejs'

/**
 * @swagger
 * /api/v1/chats/archive:
 *   post:
 *     tags: [Chats]
 *     summary: Archive multiple chats
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Chats archived
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const body = await req.json().catch(() => ({})) as any
    const ids = Array.isArray(body?.ids) ? body.ids.filter((v: any) => typeof v === 'string' && v.length > 0) : []
    if (ids.length === 0) return NextResponse.json({ ok: true })

    await db.chat.updateMany({ where: { id: { in: ids }, userId }, data: { archived: 1, updatedAt: new Date() } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Archive chats (batch) error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


