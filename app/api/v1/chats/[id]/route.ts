import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from 'next/server';
import { ChatStore } from '@/lib/modules/chat';

export const runtime = 'nodejs'

/**
 * @swagger
 * /api/v1/chats/{id}:
 *   delete:
 *     tags: [Chats]
 *     summary: Delete a chat by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 *   patch:
 *     tags: [Chats]
 *     summary: Update chat properties (archive/unarchive)
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
 *             type: object
 *             properties:
 *               archived:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Chat updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 */

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id
    const { id: chatId } = await ctx.params
    await ChatStore.deleteChat({ chatId, userId })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id
    const { id: chatId } = await ctx.params

    const body = await req.json().catch(() => ({})) as any
    const archived = typeof body?.archived === 'boolean' ? body.archived : undefined
    if (typeof archived === 'undefined') {
      return NextResponse.json({ error: 'archived flag required' }, { status: 400 })
    }

    if (archived) {
      await ChatStore.archiveChat({ chatId, userId })
    } else {
      await ChatStore.unarchiveChat({ chatId, userId })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Update chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


