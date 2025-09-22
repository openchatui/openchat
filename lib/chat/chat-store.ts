import { UIMessage, generateId } from 'ai';
import db from '@/lib/db';

// Type guard to check if an object is a UIMessage
function isUIMessage(obj: any): obj is UIMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'role' in obj &&
    'parts' in obj &&
    Array.isArray(obj.parts)
  );
}

export interface ChatData {
  id: string;
  title: string;
  messages: UIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new chat in the database
 */
export async function createChat(userId: string, initialMessage?: UIMessage, chatId?: string): Promise<string> {
  const finalChatId = chatId || generateId();
  const messages: UIMessage[] = initialMessage ? [initialMessage] : [];
  
  // Always start with default title; async process may update later
  const title = 'New Chat';

  await db.chat.create({
    data: {
      id: finalChatId,
      userId,
      title,
      chat: JSON.parse(JSON.stringify(messages)), // Convert to plain object for Prisma
      meta: {},
      updatedAt: new Date(),
    },
  });

  return finalChatId;
}

/**
 * Load a chat by ID for a specific user
 */
export async function loadChat(chatId: string, userId: string): Promise<UIMessage[] | null> {
  const chat = await db.chat.findFirst({
    where: {
      id: chatId,
      userId,
    },
    select: {
      chat: true,
    },
  });

  if (!chat) {
    return null;
  }

  // The chat field contains the messages as JSON
  // First cast to unknown, then validate the array
  const messages = chat.chat as unknown;
  if (!Array.isArray(messages)) {
    return [];
  }
  
  // Filter out any invalid messages
  return messages.filter(isUIMessage);
}

/**
 * Save messages to an existing chat
 */
export async function saveChat({
  chatId,
  userId,
  messages,
}: {
  chatId: string;
  userId: string;
  messages: UIMessage[];
}): Promise<void> {
  // Ensure chat exists for this user
  const existingChat = await db.chat.findFirst({
    where: { id: chatId, userId },
    select: { id: true },
  });

  if (!existingChat) {
    throw new Error('Chat not found');
  }

  await db.chat.update({
    where: { id: chatId },
    data: {
      chat: JSON.parse(JSON.stringify(messages)), // Convert to plain object for Prisma
      updatedAt: new Date(),
    },
  });
}

/**
 * Get all chats for a user (for sidebar display)
 */
export async function getUserChats(userId: string): Promise<ChatData[]> {
  const chats = await db.chat.findMany({
    where: {
      userId,
      archived: 0,
    },
    select: {
      id: true,
      title: true,
      chat: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return chats.map(chat => {
    const raw = chat.chat as unknown;
    const messages = Array.isArray(raw) ? raw.filter(isUIMessage) : [];
    return {
      id: chat.id,
      title: chat.title,
      messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  });
}

/**
 * Get archived chats for a user
 */
export async function getUserArchivedChats(userId: string): Promise<ChatData[]> {
  const chats = await db.chat.findMany({
    where: {
      userId,
      archived: { not: 0 },
    },
    select: {
      id: true,
      title: true,
      chat: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return chats.map(chat => {
    const raw = chat.chat as unknown;
    const messages = Array.isArray(raw) ? raw.filter(isUIMessage) : [];
    return {
      id: chat.id,
      title: chat.title,
      messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  });
}

/**
 * Check if a chat exists and belongs to the user
 */
export async function chatExists(chatId: string, userId: string): Promise<boolean> {
  const chat = await db.chat.findFirst({
    where: {
      id: chatId,
      userId,
    },
    select: {
      id: true,
    },
  });

  return !!chat;
}

/**
 * Delete a chat
 */
export async function deleteChat(chatId: string, userId: string): Promise<void> {
  await db.chat.deleteMany({
    where: {
      id: chatId,
      userId,
    },
  });
}

/**
 * Archive a chat
 */
export async function archiveChat(chatId: string, userId: string): Promise<void> {
  await db.chat.updateMany({
    where: {
      id: chatId,
      userId,
    },
    data: {
      archived: 1,
      updatedAt: new Date(),
    },
  });
}

/**
 * Unarchive a chat
 */
export async function unarchiveChat(chatId: string, userId: string): Promise<void> {
  await db.chat.updateMany({
    where: {
      id: chatId,
      userId,
    },
    data: {
      archived: 0,
      updatedAt: new Date(),
    },
  });
}

/**
 * Update a chat's title (ensures ownership)
 */
export async function updateChatTitle(chatId: string, userId: string, title: string): Promise<void> {
  await db.chat.updateMany({
    where: { id: chatId, userId },
    data: {
      title,
      updatedAt: new Date(),
    },
  });
}
