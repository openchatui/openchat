import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from 'next/server';
import { ChatStore } from '@/lib/modules/chat';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
export const runtime = 'nodejs';

/**
 * @swagger
 * /api/v1/chats:
 *   post:
 *     tags: [Chats]
 *     summary: Create a new chat
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: object
 *                 properties:
 *                   text:
 *                     type: string
 *                   model:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       profile_image_url:
 *                         type: string
 *                         nullable: true
 *                   attachments:
 *                     type: array
 *                     items:
 *                       oneOf:
 *                         - type: object
 *                           required: [type, image, mediaType]
 *                           properties:
 *                             type: { type: string, enum: [image] }
 *                             image: { type: string, description: "Signed URL or data: URI" }
 *                             mediaType: { type: string }
 *                             fileId: { type: string }
 *                             localId: { type: string }
 *                         - type: object
 *                           required: [type, data, mediaType, filename]
 *                           properties:
 *                             type: { type: string, enum: [file] }
 *                             data: { type: string, description: "Signed URL or data: URI" }
 *                             mediaType: { type: string }
 *                             filename: { type: string }
 *                             fileId: { type: string }
 *                             localId: { type: string }
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
    // Optionally seed chat with an initial user message
    let initialMessage: any | undefined = undefined;
    try {
      const BodySchema = z.object({
        message: z.object({
          text: z.string(),
          model: z.object({
            id: z.string(),
            name: z.string().optional(),
            profile_image_url: z.string().nullable().optional(),
          }).optional(),
          attachments: z.array(
            z.union([
              z.object({
                type: z.literal('image'),
                image: z.string(),
                mediaType: z.string(),
                fileId: z.string().optional(),
                localId: z.string().optional(),
              }),
              z.object({
                type: z.literal('file'),
                data: z.string(),
                mediaType: z.string(),
                filename: z.string(),
                fileId: z.string().optional(),
                localId: z.string().optional(),
              }),
            ])
          ).optional(),
        }).optional(),
        initialMessage: z.any().optional(), // ignored if provided; we rebuild below
      }).optional();
      const raw = await req.json();
      const body = BodySchema.parse(raw);
      if (body && body.message && typeof body.message.text === 'string') {
        const text: string = body.message.text;
        const model = body.message.model;
        const modelId = typeof model?.id === 'string' ? model.id : undefined;
        const modelName = typeof model?.name === 'string' ? model.name : undefined;
        const modelImage = (typeof model?.profile_image_url === 'string' || model?.profile_image_url === null)
          ? model.profile_image_url
          : undefined;
        const attachments = Array.isArray(body.message.attachments) ? body.message.attachments : undefined;

        initialMessage = {
          id: `msg_${Date.now()}`,
          role: 'user',
          parts: [{ type: 'text', text }],
          metadata: {
            createdAt: Date.now(),
            ...(modelId || modelName || typeof modelImage !== 'undefined'
              ? { model: { id: modelId ?? 'unknown', name: modelName ?? 'Unknown Model', profile_image_url: modelImage ?? null } }
              : {}),
            ...(attachments && attachments.length > 0 ? { attachments } : {}),
          },
        };
      }
    } catch {
      // ignore invalid or empty bodies
    }

    const chatId = await ChatStore.createChat({ userId, initialMessage });

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
    const url = new URL(req.url);
    const offsetParam = url.searchParams.get('offset');
    const limitParam = url.searchParams.get('limit');

    if (offsetParam === null && limitParam === null) {
      const chats = await ChatStore.getUserChats(userId);
      return NextResponse.json({ chats });
    }

    const offset = Number.isFinite(Number(offsetParam)) ? Number(offsetParam) : 0;
    const limit = Number.isFinite(Number(limitParam)) ? Number(limitParam) : 100;
    const page = await ChatStore.getUserChatsPage(userId, { offset, limit });

    // Backwards compatibility: also include `chats` key mapping to items
    return NextResponse.json({
      items: page.items,
      nextOffset: page.nextOffset,
      hasMore: page.hasMore,
      total: page.total,
      chats: page.items,
    });
  } catch (error) {
    console.error('Get chats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
