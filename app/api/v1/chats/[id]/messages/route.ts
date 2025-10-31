import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from 'next/server';
import { ChatStore } from '@/lib/modules/chat';

export const runtime = 'nodejs'

/**
 * @swagger
 * /api/v1/chats/{id}/messages:
 *   get:
 *     tags: [Chats]
 *     summary: Get chat messages by chat ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages list
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id
    const { id: chatId } = await ctx.params
    const messages = await ChatStore.loadChat({ chatId, userId })
    if (!messages) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const normalized = messages.map((message: any) => {
      if (message.role === 'assistant') {
        const meta = (message as any).metadata || {}
        if (!meta.assistantDisplayName || !meta.assistantImageUrl) {
          const model = meta.model
          return {
            ...message,
            metadata: {
              ...meta,
              assistantDisplayName: model?.name || 'AI Assistant',
              assistantImageUrl: model?.profile_image_url || '/avatars/01.png',
            }
          }
        }
      }
      return message
    })

    return NextResponse.json({ messages: normalized })
  } catch (error) {
    console.error('GET /chats/{id}/messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


