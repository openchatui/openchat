"use server";

import ChatClient from "@/components/chat/ChatClient";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { chatExists, createChat, getUserChats } from "@/lib/chat/chat-store";
import { getActiveModels, loadChatMessages } from "@/actions/chat";
import { cookies } from "next/headers";
import { getWebSearchEnabled, getImageGenerationAvailable, getAudioConfig } from "@/lib/server/config";
import { AppConfigProvider } from "@/components/providers/AppConfigProvider";

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
    // Load the existing chat messages (with assistant display info)
    initialMessages = await loadChatMessages(chatId);
  }

  // Load all data in parallel for better performance
  const [initialChats, initialModels, webSearchAvailable, imageAvailable, audioConfig] = await Promise.all([
    getUserChats(userId),
    getActiveModels(),
    getWebSearchEnabled(),
    getImageGenerationAvailable(),
    getAudioConfig(),
  ]);

  // Extract assistant display info from the most recent assistant message
  let assistantDisplayName = 'AI Assistant';
  let assistantImageUrl = '/avatars/01.png';

  if (initialMessages.length > 0) {
    for (let i = initialMessages.length - 1; i >= 0; i--) {
      const message = initialMessages[i];
      if (message.role === 'assistant') {
        const meta = (message as any).metadata;
        if (meta?.assistantDisplayName && meta?.assistantImageUrl) {
          assistantDisplayName = meta.assistantDisplayName;
          assistantImageUrl = meta.assistantImageUrl;
          break;
        }
      }
    }
  }

  // Determine critical images to preload
  const criticalImages: string[] = [];

  // Add OpenChat logo and default avatar as fallback
  criticalImages.push('/OpenChat.png');
  criticalImages.push('/avatars/01.png');

  // Add assistant image if it's local and not already in the list
  if (assistantImageUrl &&
      (assistantImageUrl.startsWith('/') || assistantImageUrl.startsWith('./')) &&
      !criticalImages.includes(assistantImageUrl)) {
    criticalImages.push(assistantImageUrl);
  }

  // Resolve user timezone from cookie (fallback to UTC for deterministic SSR)
  const cookieStore = await cookies()
  const timeZone = cookieStore.get('tz')?.value || 'UTC'

  return (
    <>
      {/* Preload critical images */}
      {criticalImages.map((imageSrc) => (
        <link
          key={imageSrc}
          rel="preload"
          href={imageSrc}
          as="image"
          type="image/png"
        />
      ))}

      <AppConfigProvider initial={{
        webSearchAvailable,
        imageAvailable,
        audio: {
          ttsEnabled: audioConfig.ttsEnabled,
          sttEnabled: audioConfig.sttEnabled,
          ttsProvider: audioConfig.tts.provider,
          sttProvider: audioConfig.stt.provider as any,
          whisperWebModel: audioConfig.stt.whisperWeb.model,
        }
      }}>
        <ChatClient
          session={session}
          chatId={chatId}
          initialMessages={initialMessages}
          initialChats={initialChats}
          initialModels={initialModels}
          assistantDisplayName={assistantDisplayName}
          assistantImageUrl={assistantImageUrl}
          timeZone={timeZone}
          webSearchAvailable={webSearchAvailable}
          imageAvailable={imageAvailable}
        />
      </AppConfigProvider>
    </>
  );
}
