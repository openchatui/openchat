import db from '@/lib/db';
import { canReadModelById } from '@/lib/server/access-control'
import { resolveAiProvider } from '@/lib/ai/provider';
import type { UIMessage } from 'ai';
import type { MessageMetadata } from '@/types/messages';

interface SelectedModelInfo {
  id: string;
  name: string;
  profile_image_url?: string | null;
}

interface ResolveArgs {
  userId: string;
  modelId?: string;
  messages: UIMessage<MessageMetadata>[];
  defaultModelName?: string;
}

export async function resolveModelInfoAndHandle({
  userId,
  modelId,
  messages,
  defaultModelName = 'gpt-4o',
}: ResolveArgs): Promise<{
  selectedModelInfo: SelectedModelInfo;
  modelName: string;
  modelContextTokens: number | null;
  modelHandle: any;
  providerModelId: string;
}> {
  let modelName = defaultModelName;
  let selectedModelInfo: SelectedModelInfo | null = null;
  let modelContextTokens: number | null = null;

  if (modelId) {
    const readable = await canReadModelById(userId, modelId)
    if (readable) {
      const model = await db.model.findFirst({
        where: { id: modelId },
        select: { id: true, name: true, meta: true },
      });
      if (model) {
        modelName = model.name;
        selectedModelInfo = {
          id: model.id,
          name: model.name,
          profile_image_url: (model as any).meta?.profile_image_url ?? null,
        };
        const m = (model as any).meta || {};
        modelContextTokens =
          m.context_window || m.contextWindow || m.context || m.max_context ||
          m.details?.context_window || m.details?.context || null;
      }
    }
  }

  if (!selectedModelInfo) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i] as UIMessage<MessageMetadata>;
      if (m.role === 'user' && (m as any).metadata?.model) {
        selectedModelInfo = (m as any).metadata.model as SelectedModelInfo;
        break;
      }
    }
  }

  if (!selectedModelInfo) {
    const modelByName = await db.model.findFirst({
      where: { name: modelName, userId },
      select: { id: true, name: true, meta: true },
    });
    if (modelByName) {
      selectedModelInfo = {
        id: modelByName.id,
        name: modelByName.name,
        profile_image_url: (modelByName as any).meta?.profile_image_url ?? null,
      };
    }
  }

  if (!selectedModelInfo) {
    selectedModelInfo = { id: modelName, name: modelName, profile_image_url: null };
  }

  if (selectedModelInfo?.name) {
    modelName = selectedModelInfo.name;
  }

  const { getModelHandle, providerModelId } = await resolveAiProvider({ model: modelId || modelName });
  const modelHandle = getModelHandle(providerModelId);

  return { selectedModelInfo, modelName, modelContextTokens, modelHandle, providerModelId };
}


