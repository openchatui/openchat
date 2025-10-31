"use server";

import { ChatLanding } from "@/components/chat/chat-landing";
import { auth, AuthService } from "@/lib/auth";
import { isAuthEnabled } from "@/lib/auth/toggle";
import { redirect } from "next/navigation";
import { listActiveModelsLight } from "@/lib/api/models";
import { getUserSettings } from "@/lib/api/userSettings";
import { cookies } from "next/headers";
import { getWebSearchConfig } from "@api/websearch";
import { getImageConfig } from "@api/image";
import { getConnectionsConfig } from "@api/connections";
import { getAudioConfig as getAudioConfigApi } from "@api/audio";
import { getEffectivePermissionsForUser } from "@/lib/modules/access-control/permissions.service";
import { filterModelsReadableByUser } from "@/lib/modules/access-control/model-access.service";
import db from "@/lib/db";
import { ensurePublicUser } from "@/lib/auth/public-user";
import { AppConfigProvider } from "@/components/providers/AppConfigProvider";
import type { EffectivePermissions } from "@/lib/modules/access-control/permissions.types";

export default async function Page() {
  const firstUser = await AuthService.isFirstUser();
  if (firstUser) redirect("/setup");

  const session = await auth();
  if (isAuthEnabled() && !session?.user?.id) redirect("/login");

  // Load data server-side for better performance (minimize DB and external calls)
  const [models, userSettings] = await Promise.all([
    listActiveModelsLight(),
    session?.user?.id ? getUserSettings(session.user.id) : Promise.resolve({} as any),
  ]);

  // Load feature availability and user permissions on the server via API helpers
  const [webCfg, imgCfg, connCfg, audioConfig] = await Promise.all([
    getWebSearchConfig(),
    getImageConfig(),
    getConnectionsConfig(),
    getAudioConfigApi(),
  ]);

  const webSearchAvailable = !!(webCfg?.websearch?.ENABLED);
  const imageAvailable = (() => {
    const provider = imgCfg?.image?.provider || 'openai';
    if (provider !== 'openai') return false;
    const imageKey = (imgCfg?.image?.openai?.apiKey || '').trim();
    if (imageKey) return true;
    const keys = Array.isArray((connCfg as any)?.connections?.openai?.api_keys)
      ? ((connCfg as any).connections.openai.api_keys as unknown[])
      : [];
    return keys.some((k) => typeof k === 'string' && (k as string).trim().length > 0);
  })();

  const defaultEff: EffectivePermissions = {
    workspace: {
      models: false,
      knowledge: false,
      prompts: false,
      tools: false,
    },
    sharing: {
      public_models: false,
      public_knowledge: false,
      public_prompts: false,
      public_tools: false,
    },
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
    features: {
      direct_tool_servers: false,
      web_search: false,
      image_generation: false,
      code_interpreter: false,
      notes: false,
    },
  };

  let eff: EffectivePermissions = session?.user?.id
    ? await getEffectivePermissionsForUser(session.user.id)
    : defaultEff;

  let effectiveModels = models;
  if (!session?.user?.id && !isAuthEnabled()) {
    // Public mode: ensure a public user exists and use its permissions to compute visible models
    const publicUser = await ensurePublicUser();
    eff = await getEffectivePermissionsForUser(publicUser.id);
    const modelsRaw = await db.model.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        isActive: true,
        meta: true,
        userId: true,
        accessControl: true,
      } as any,
    });
    effectiveModels = await filterModelsReadableByUser(
      publicUser.id,
      modelsRaw as any
    );
  }

  // eff is always non-null here (typed as EffectivePermissions)

  // Resolve user timezone from cookie (fallback to UTC for deterministic SSR)
  const cookieStore = await cookies();
  const timeZone = cookieStore.get("tz")?.value || "UTC";

  // Avoid per-chat message loading here; landing is lightweight

  // Build pinned models list from user settings
  const pinnedIds: string[] = Array.isArray(
    (userSettings as any)?.ui?.pinned_models
  )
    ? ((userSettings as any).ui.pinned_models as string[])
    : [];
  const pinnedModels = models.filter((m) => pinnedIds.includes(m.id));

  return (
    <>
      <AppConfigProvider
        initial={{
          webSearchAvailable,
          imageAvailable,
          audio: {
            ttsEnabled: audioConfig.ttsEnabled,
            sttEnabled: audioConfig.sttEnabled,
            ttsProvider: audioConfig.tts?.provider || 'openai',
            sttProvider: (audioConfig.stt?.provider || 'whisper-web') as 'whisper-web' | 'openai' | 'webapi' | 'deepgram',
            whisperWebModel: audioConfig.stt?.whisperWeb?.model || 'Xenova/whisper-small',
          },
        }}
      >
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
  );
}
