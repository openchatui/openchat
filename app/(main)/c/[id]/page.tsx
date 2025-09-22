"use server";

import { Suspense } from "react";
import ChatClient from "@/components/chat/ChatClient";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { chatExists, createChat } from "@/lib/chat/chat-store";
import { getActiveModelsLight, loadChatMessages } from "@/actions/chat";
import { cookies } from "next/headers";
import { getWebSearchEnabled, getImageGenerationAvailable, getAudioConfig } from "@/lib/server/config";
import { getEffectivePermissionsForUser } from "@/lib/server/access-control";
import { AppConfigProvider } from "@/components/providers/AppConfigProvider";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  return (
    <Suspense fallback={null}>
      {/* Stream heavy content */}
      {/* @ts-ignore Async Server Component */}
      <ChatPageContent params={params} />
    </Suspense>
  );
}

async function ChatPageContent({ params }: ChatPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id: chatId } = await params;
  const userId = session.user.id as string;

  // Ensure chat exists; allow this to stream later
  const exists = await chatExists(chatId, userId);
  let initialMessages: any[] = [];
  if (!exists) {
    try {
      await createChat(userId, undefined, chatId);
    } catch (error) {
      console.error('Failed to create chat:', error);
      redirect("/");
    }
  } else {
    initialMessages = await loadChatMessages(chatId);
  }

  const [initialModels, webSearchAvailable, imageAvailable, audioConfig, eff] = await Promise.all([
    getActiveModelsLight(),
    getWebSearchEnabled(),
    getImageGenerationAvailable(),
    getAudioConfig(),
    getEffectivePermissionsForUser(userId),
  ]);

  // Assistant display info
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

  // Resolve user timezone
  const cookieStore = await cookies()
  const timeZone = cookieStore.get('tz')?.value || 'UTC'

  return (
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
        initialChats={[]}
        initialModels={initialModels}
        assistantDisplayName={assistantDisplayName}
        assistantImageUrl={assistantImageUrl}
        timeZone={timeZone}
        webSearchAvailable={webSearchAvailable}
        imageAvailable={imageAvailable}
        permissions={{
          workspaceTools: eff.workspace.tools,
          webSearch: eff.features.web_search,
          imageGeneration: eff.features.image_generation,
          codeInterpreter: eff.features.code_interpreter,
          stt: eff.chat.stt,
          tts: eff.chat.tts,
        }}
      />
    </AppConfigProvider>
  );
}
