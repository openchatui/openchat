"use server";

import InitialChatClient from "@/components/chat/InitialChatClient";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveModelsLight, getUserSettings } from "@/actions/chat";
import { cookies } from "next/headers";
import { getWebSearchEnabled, getImageGenerationAvailable, getAudioConfig } from "@/lib/server";
import { getEffectivePermissionsForUser } from "@/lib/server";
import { AppConfigProvider } from "@/components/providers/AppConfigProvider";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Load data server-side for better performance (minimize DB and external calls)
  const [models, userSettings] = await Promise.all([
    getActiveModelsLight(),
    getUserSettings()
  ]);

  // Load feature availability and user permissions on the server
  const [webSearchAvailable, imageAvailable, audioConfig, eff] = await Promise.all([
    getWebSearchEnabled(),
    getImageGenerationAvailable(),
    getAudioConfig(),
    getEffectivePermissionsForUser(session.user.id),
  ])

  // Resolve user timezone from cookie (fallback to UTC for deterministic SSR)
  const cookieStore = await cookies()
  const timeZone = cookieStore.get('tz')?.value || 'UTC'

  // Avoid expensive per-chat message loading; model will default from settings or first active

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
        <InitialChatClient
          session={session}
          initialModels={models}
          initialUserSettings={userSettings as Record<string, any>}
          pinnedModels={pinnedModels}
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
    </>
  )
}
