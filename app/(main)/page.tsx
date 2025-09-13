"use server";

import InitialChatClient from "@/components/chat/InitialChatClient";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getInitialChats, getModels, getUserSettings, loadChatMessages } from "@/actions/chat";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Load data server-side for better performance
  const [chats, models, userSettings] = await Promise.all([
    getInitialChats(),
    getModels(),
    getUserSettings()
  ]);

  // Find the most recent chat with assistant messages and get its last model
  let lastUsedModelId: string | null = null;

  if (chats.length > 0) {
    // Try to find the most recent chat that has assistant messages (chats are already sorted by updatedAt desc)
    for (const chat of chats) {
      try {
        const messages = await loadChatMessages(chat.id);
        // Check if this chat has any assistant messages
        const hasAssistantMessages = messages.some(msg => msg.role === 'assistant');
        if (hasAssistantMessages) {
          // Find the last assistant message
          for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (message.role === 'assistant') {
              const meta = (message as any).metadata;
              if (meta?.model?.id) {
                lastUsedModelId = meta.model.id;
                break;
              }
            }
          }
          if (lastUsedModelId) break; // Found a model, no need to check other chats
        }
      } catch (error) {
        // Skip this chat if loading fails
        console.error(`Failed to load messages for chat ${chat.id}:`, error);
      }
    }
  }

  // Extract critical images for preloading
  const criticalImages: string[] = [];

  // Add OpenChat logo and default avatar
  criticalImages.push('/OpenChat.png');
  criticalImages.push('/avatars/01.png');

  // Add first active model's profile image if it's a local image and not a duplicate
  const activeModels = models.filter(model => model.isActive && !model.meta?.hidden);
  if (activeModels.length > 0) {
    const firstModelImage = activeModels[0].meta?.profile_image_url;
    if (firstModelImage &&
        (firstModelImage.startsWith('/') || firstModelImage.startsWith('./')) &&
        !criticalImages.includes(firstModelImage)) {
      criticalImages.push(firstModelImage);
    }
  }

  // Build pinned models list from user settings
  const pinnedIds: string[] = Array.isArray((userSettings as any)?.ui?.pinned_models)
    ? ((userSettings as any).ui.pinned_models as string[])
    : []
  const pinnedModels = models.filter(m => pinnedIds.includes(m.id))

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

      <InitialChatClient
        session={session}
        initialChats={chats}
        initialModels={models}
        initialUserSettings={userSettings as Record<string, any>}
        lastUsedModelId={lastUsedModelId}
        pinnedModels={pinnedModels}
      />
    </>
  )
}
