"use server";

import ChatClient from "@/components/chat/ChatClient";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadChat, chatExists, createChat, getUserChats } from "@/lib/chat-store";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: chatId } = await params;
  const userId = session.user.id as string;

  // Check if the chat exists for this user
  const exists = await chatExists(chatId, userId);
  let initialMessages: any[] = [];
  
  if (!exists) {
    try {
      await createChat(userId, undefined, chatId);
      initialMessages = [];
    } catch (error) {
      console.error('Failed to create chat:', error);
      redirect("/");
    }
  } else {
    // Load the existing chat messages
    initialMessages = await loadChat(chatId, userId) || [];
  }

  const initialChats = await getUserChats(userId);

  return (
    <ChatClient 
      session={session}
      chatId={chatId}
      initialMessages={initialMessages}
      initialChats={initialChats}
    />
  );
}
