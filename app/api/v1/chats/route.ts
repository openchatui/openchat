import { auth } from '@/lib/auth/auth';
import { NextRequest, NextResponse } from 'next/server';
import { createChat, getUserChats } from '@/lib/chat/chat-store';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * @swagger
 * /api/v1/chats:
 *   post:
 *     tags: [Chats]
 *     summary: Create a new chat
 *     responses:
 *       200:
 *         description: Chat created
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   get:
 *     tags: [Chats]
 *     summary: Get all chats for the current user
 *     responses:
 *       200:
 *         description: List of chats
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
/**
 * Create a new chat
 */

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const chatId = await createChat(userId);

    return NextResponse.json({ chatId });
  } catch (error) {
    console.error('Create chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get all chats for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const chats = await getUserChats(userId);

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Get chats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
