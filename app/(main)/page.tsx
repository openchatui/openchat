"use server";

import { ChatLanding } from "@/components/chat/chat-landing";
import { auth, AuthService } from "@/lib/auth";
import { isAuthEnabled } from "@/lib/auth/toggle";
import { redirect } from "next/navigation";
import { getActiveModelsLight, getUserSettings } from "@/actions/chat";
import { cookies } from "next/headers";
import { getWebSearchEnabled, getImageGenerationAvailable, getAudioConfig } from "@/lib/server";
import { getEffectivePermissionsForUser, filterModelsReadableByUser } from "@/lib/server";
import db from "@/lib/db";
import { ensurePublicUser } from "@/lib/auth/public-user";
import { AppConfigProvider } from "@/components/providers/AppConfigProvider";
import type { EffectivePermissions } from "@/lib/server/access-control/permissions.types";

export default async function Page() {
  const firstUser = await AuthService.isFirstUser();
  if (firstUser) redirect("/setup");

  const session = await auth();
  if (isAuthEnabled() && !session?.user?.id) redirect("/login");

  // Load data server-side for better performance (minimize DB and external calls)
  const [models, userSettings] = await Promise.all([
    getActiveModelsLight(),
    getUserSettings()
  ]);

  // Load feature availability and user permissions on the server
  const [webSearchAvailable, imageAvailable, audioConfig] = await Promise.all([
    getWebSearchEnabled(),
    getImageGenerationAvailable(),
    getAudioConfig(),
  ])

  const defaultEff: EffectivePermissions = {
    workspace: { models: false, knowledge: false, prompts: false, tools: false },
    sharing: { public_models: false, public_knowledge: false, public_prompts: false, public_tools: false },
    chat: {
      controls: false,
      valves: false,
      system_prompt: false,
      params: false,
      file_upload: false,
      delete: false,
      edit: false,
      share: false,
      export: false,
      stt: false,
      tts: false,
      call: false,
      multiple_models: false,
      temporary: false,
      temporary_enforced: false,
    },
    features: { direct_tool_servers: false, web_search: false, image_generation: false, code_interpreter: false, notes: false },
  }

  let eff: EffectivePermissions = session?.user?.id
    ? await getEffectivePermissionsForUser(session.user.id)
    : defaultEff

  let effectiveModels = models
  if (!session?.user?.id && !isAuthEnabled()) {
    // Public mode: ensure a public user exists and use its permissions to compute visible models
    const publicUser = await ensurePublicUser()
    eff = await getEffectivePermissionsForUser(publicUser.id)
    const modelsRaw = await db.model.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, isActive: true, meta: true, userId: true, accessControl: true } as any,
    })
    effectiveModels = await filterModelsReadableByUser(publicUser.id, modelsRaw as any)
  }

  // eff is always non-null here (typed as EffectivePermissions)

  // Resolve user timezone from cookie (fallback to UTC for deterministic SSR)
  const cookieStore = await cookies()
  const timeZone = cookieStore.get('tz')?.value || 'UTC'

  // Avoid per-chat message loading here; landing is lightweight

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
        <ChatLanding
          session={session}
          initialModels={effectiveModels}
          initialUserSettings={userSettings as Record<string, any>}
          webSearchAvailable={webSearchAvailable}
          imageAvailable={imageAvailable}
          permissions={{
            workspaceTools: !!eff.workspace.tools,
            webSearch: !!eff.features.web_search,
            imageGeneration: !!eff.features.image_generation,
            codeInterpreter: !!eff.features.code_interpreter,
            stt: !!eff.chat.stt,
            tts: !!eff.chat.tts,
          }}
        />
      </AppConfigProvider>
    </>
  )
}
