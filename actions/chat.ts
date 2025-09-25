"use server"

import { createOpenAI } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages, validateUIMessages, createIdGenerator } from 'ai';
import { auth } from "@/lib/auth";
import db from '@/lib/db';
import { getEffectivePermissionsForUser, filterModelsReadableByUser } from '@/lib/server'
import { ChatStore, type ChatData } from '@/lib/features/chat';
import type { MessageMetadata } from '@/lib/features/chat/chat.types';
import type { Model, ModelMeta, ModelsGroupedByOwner, UpdateModelData } from '@/lib/features/models/model.types';
import { revalidatePath } from 'next/cache';
import { getConnectionsConfig as getConnectionsConfigAction } from '@/actions/connections';
import { cache } from 'react';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function getConnectionsConfig(): Promise<any> {
  try {
    const { connections } = await getConnectionsConfigAction()
    const openai = (connections as any)?.openai || {}
    const ollama = (connections as any)?.ollama || {}
    return { openai, ollama }
  } catch {
    return { openai: {}, ollama: {} }
  }
}

function normalizeProviderName(raw?: string | null): 'openai' | 'openrouter' | 'ollama' | 'openai-compatible' | null {
  const name = String(raw || '').toLowerCase()
  if (!name) return null
  if (name.includes('openrouter')) return 'openrouter'
  if (name.includes('ollama')) return 'ollama'
  if (name.includes('openai')) return 'openai'
  if (name.includes('compatible')) return 'openai-compatible'
  return null
}

function computeProviderEnabled(connectionsCfg: any, provider?: string | null): boolean {
  const norm = normalizeProviderName(provider)
  if (norm === 'ollama') {
    return Boolean((connectionsCfg?.ollama || {}).enable)
  }
  if (norm === 'openrouter' || norm === 'openai' || norm === 'openai-compatible') {
    const openai = connectionsCfg?.openai || {}
    const apiConfigs = isPlainObject(openai.api_configs) ? openai.api_configs as Record<string, any> : {}
    const entries = Object.values(apiConfigs)
    if (entries.length > 0) {
      // Enabled if at least one entry is not explicitly disabled
      return entries.some((e: any) => e && e.enable !== false)
    }
    // Fallback to top-level flag only when there are no per-connection configs
    return openai.enable !== false
  }
  // Unknown providers default to enabled
  return true
}

async function getOllamaBaseUrl(connectionsCfg?: any): Promise<string> {
  const cfgUrl = (() => {
    const urls = (connectionsCfg?.ollama?.base_urls || []) as string[]
    if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string') return urls[0]
    return null
  })()
  if (cfgUrl) return cfgUrl
  try {
    const row = await db.connection.findFirst({ where: { type: 'ollama' }, select: { baseUrl: true } })
    if (row?.baseUrl) return row.baseUrl
  } catch {}
  return 'http://localhost:11434'
}

async function getActiveOllamaModelNames(connectionsCfg?: any): Promise<Set<string>> {
  try {
    const base = await getOllamaBaseUrl(connectionsCfg)
    const url = base.replace(/\/+$/, '') + '/api/ps'
    // Short-circuit quickly if the local Ollama daemon is slow/unavailable
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 100)
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    }).catch(() => ({ ok: false, json: async () => null } as any))
    clearTimeout(timeout)
    const data = await res.json().catch(() => null)
    if (!res.ok || !data) return new Set<string>()
    const list: any[] = Array.isArray(data?.models) ? data.models : (Array.isArray(data) ? data : [])
    const names = list
      .map((m: any) => (typeof m?.name === 'string' ? m.name : (typeof m?.model === 'string' ? m.model : null)))
      .filter((v: any) => typeof v === 'string')
    return new Set<string>(names as string[])
  } catch {
    return new Set<string>()
  }
}

// Server action to send a message and get streaming response
export async function sendMessage(
  chatId: string,
  message: UIMessage<MessageMetadata>,
  modelId?: string
): Promise<ReadableStream> {
  try {
    // Get the current session
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    // Check if chat exists, create if not
    const exists = await ChatStore.chatExists(chatId, userId);
    let finalMessages: UIMessage<MessageMetadata>[] = [];

    if (!exists) {
      await ChatStore.createChat({ userId, chatId });
      finalMessages = [message];
    } else {
      // Load previous messages and append new one
      const previousMessages = await ChatStore.loadChat({ chatId, userId });
      if (previousMessages === null) {
        throw new Error('Chat not found');
      }
      const previousMessagesTyped = previousMessages as unknown as UIMessage<MessageMetadata>[];
      finalMessages = [...previousMessagesTyped, message];
    }

    // Get OpenAI API key from connections
    const openaiConnection = await db.connection.findFirst({
      where: {
        type: 'openai-api',
        apiKey: {
          not: null
        }
      },
      select: {
        apiKey: true,
        baseUrl: true
      }
    });

    if (!openaiConnection?.apiKey) {
      throw new Error('OpenAI API key not configured. Please add an OpenAI connection in settings.');
    }

    // Determine the model to use
    let modelName = 'gpt-4o'; // default
    let selectedModelInfo: { id: string; name: string; profile_image_url?: string | null } | null = null;
    let modelContextTokens: number | null = null;

    if (modelId) {
      const model = await db.model.findUnique({
        where: { id: modelId },
        select: { id: true, name: true, meta: true }
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

    // Fallbacks to populate selectedModelInfo
    if (!selectedModelInfo) {
      for (let i = finalMessages.length - 1; i >= 0; i--) {
        const m = finalMessages[i] as UIMessage<MessageMetadata>;
        if (m.role === 'user' && m.metadata?.model) {
          selectedModelInfo = m.metadata.model;
          break;
        }
      }
    }

    if (!selectedModelInfo) {
      const modelByName = await db.model.findFirst({
        where: { name: modelName },
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
      selectedModelInfo = {
        id: modelName,
        name: modelName,
        profile_image_url: null,
      };
    }

    if (selectedModelInfo?.name) {
      modelName = selectedModelInfo.name;
    }

    const openai = createOpenAI({
      apiKey: openaiConnection.apiKey,
      baseURL: openaiConnection.baseUrl !== 'https://api.openai.com/v1' ? openaiConnection.baseUrl : undefined,
    });

    // Filter to text-only parts for provider payload
    const filterToTextParts = (msgs: UIMessage<MessageMetadata>[]) => {
      const MAX_CHARS_PER_MESSAGE = 4000;
      return msgs
        .map((m) => ({
          ...m,
          parts: (m.parts || [])
            .filter((p: any) => p?.type === 'text')
            .map((p: any) => ({ ...p, text: String(p.text || '').slice(0, MAX_CHARS_PER_MESSAGE) })),
        }))
        .filter((m) => Array.isArray(m.parts) && m.parts.length > 0);
    };

    // Trim history by character budget
    const trimByCharBudget = (
      msgs: UIMessage<MessageMetadata>[],
      maxChars: number,
      minTailMessages: number = 8
    ) => {
      if (msgs.length === 0) return msgs;
      const systemMsg = msgs.find((m) => m.role === 'system');
      const nonSystem = msgs.filter((m) => m !== systemMsg);
      const countChars = (arr: UIMessage[]) =>
        arr.reduce((sum, m) => {
          const txt = (m.parts || [])
            .filter((p: any) => p?.type === 'text')
            .map((p: any) => p.text || '')
            .join('');
          return sum + (txt?.length || 0);
        }, 0);
      let tail = nonSystem.slice(-minTailMessages);
      let head = nonSystem.slice(0, Math.max(0, nonSystem.length - tail.length));
      const rebuilt: UIMessage<MessageMetadata>[] = [];
      for (let i = tail.length - 1; i >= 0; i--) {
        rebuilt.unshift(tail[i]);
        if (countChars([...(systemMsg ? [systemMsg] : []), ...rebuilt]) > maxChars) {
          rebuilt.shift();
          break;
        }
      }
      for (let i = head.length - 1; i >= 0; i--) {
        const candidate = head[i];
        const next = [candidate, ...rebuilt];
        if (countChars([...(systemMsg ? [systemMsg] : []), ...next]) <= maxChars) {
          rebuilt.unshift(candidate);
        } else {
          break;
        }
      }
      return [...(systemMsg ? [systemMsg] : []), ...rebuilt];
    };

    const approxCharsPerToken = 4;
    const defaultMaxTokens = 12000;
    const effectiveTokens = Math.max(
      2000,
      Math.floor((modelContextTokens ?? defaultMaxTokens) * 0.8)
    );
    const maxCharsBudget = effectiveTokens * approxCharsPerToken;

    const fullMessages = finalMessages as UIMessage<MessageMetadata>[];

    // Try streaming with full messages first
    try {
      const validatedMessages = await validateUIMessages({ messages: fullMessages });
      const result = streamText({
        model: openai(modelName),
        messages: convertToModelMessages(
          validatedMessages as UIMessage<MessageMetadata>[]
        ),
      });

      return result.toUIMessageStreamResponse({
        originalMessages: validatedMessages as UIMessage<MessageMetadata>[],
        generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
        messageMetadata: ({ part }) => {
          if (part.type === 'start') {
            return {
              createdAt: Date.now(),
              ...(selectedModelInfo ? { model: selectedModelInfo } : {}),
              // Pre-compute assistant display info
              assistantDisplayName: selectedModelInfo?.name || 'AI Assistant',
              assistantImageUrl: selectedModelInfo?.profile_image_url || '/avatars/01.png',
            } as MessageMetadata;
          }
          if (part.type === 'finish') {
            return {
              totalTokens: part.totalUsage?.totalTokens,
            } as MessageMetadata;
          }
          return undefined;
        },
        onFinish: async ({ messages }) => {
          await ChatStore.saveChat({
            chatId,
            userId,
            messages: messages as unknown as UIMessage[],
          });
        },
      }).body as ReadableStream;
    } catch (err: any) {
      const msg = String(err?.message || '');
      const code = String((err as any)?.code || '');
      const isContextError =
        code === 'context_length_exceeded' ||
        msg.toLowerCase().includes('context length') ||
        msg.toLowerCase().includes('too many tokens') ||
        msg.toLowerCase().includes('maximum context');

      if (!isContextError) throw err;

      // Retry with trimmed payload
      const textOnly = filterToTextParts(fullMessages);
      const budgetTrimmed = trimByCharBudget(textOnly, maxCharsBudget, 8);
      const validatedTrimmed = await validateUIMessages({ messages: budgetTrimmed });
      const retry = streamText({
        model: openai(modelName),
        messages: convertToModelMessages(
          validatedTrimmed as UIMessage<MessageMetadata>[]
        ),
      });

      return retry.toUIMessageStreamResponse({
        originalMessages: validatedTrimmed as UIMessage<MessageMetadata>[],
        generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
        messageMetadata: ({ part }) => {
          if (part.type === 'start') {
            return {
              createdAt: Date.now(),
              ...(selectedModelInfo ? { model: selectedModelInfo } : {}),
              // Pre-compute assistant display info
              assistantDisplayName: selectedModelInfo?.name || 'AI Assistant',
              assistantImageUrl: selectedModelInfo?.profile_image_url || '/avatars/01.png',
            } as MessageMetadata;
          }
          if (part.type === 'finish') {
            return {
              totalTokens: part.totalUsage?.totalTokens,
            } as MessageMetadata;
          }
          return undefined;
        },
        onFinish: async ({ messages }) => {
          const assistant = [...messages].reverse().find((m) => m.role === 'assistant') as UIMessage<MessageMetadata> | undefined;
          const assistantWithModel = assistant
            ? ({
                ...assistant,
                metadata: {
                  ...(assistant as any).metadata,
                  ...(selectedModelInfo ? { model: selectedModelInfo } : {}),
                },
              } as UIMessage<MessageMetadata>)
            : undefined;
          const toSave = assistantWithModel ? [...fullMessages, assistantWithModel] : fullMessages;
          await ChatStore.saveChat({
            chatId,
            userId,
            messages: toSave as unknown as UIMessage[],
          });
        },
      }).body as ReadableStream;
    }
  } catch (error) {
    console.error('Chat sendMessage error:', error);
    throw error;
  }
}

// Server action to load chat messages
export async function loadChatMessages(chatId: string): Promise<UIMessage[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    const messages = await ChatStore.loadChat({ chatId, userId });

    if (!messages || messages.length === 0) {
      return [];
    }

    // Ensure all assistant messages have display info
    return messages.map(message => {
      if (message.role === 'assistant') {
        const meta = (message as any).metadata || {};

        // If assistant display info is missing, try to get it from the message's model info
        if (!meta.assistantDisplayName || !meta.assistantImageUrl) {
          const model = meta.model;
          return {
            ...message,
            metadata: {
              ...meta,
              assistantDisplayName: model?.name || 'AI Assistant',
              assistantImageUrl: model?.profile_image_url || '/avatars/01.png',
            }
          };
        }
      }
      return message;
    });
  } catch (error) {
    console.error('Load chat messages error:', error);
    return [];
  }
}

// Server action to create a new chat
export async function createNewChat(initialMessage?: UIMessage): Promise<string> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    const chatId = await ChatStore.createChat({ userId, initialMessage });

    revalidatePath('/');
    return chatId;
  } catch (error) {
    console.error('Create chat error:', error);
    throw error;
  }
}

// Server action to get user chats for sidebar
export async function getChats(): Promise<any[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    return await ChatStore.getUserChats(userId);
  } catch (error) {
    console.error('Get chats error:', error);
    throw error;
  }
}

// Server action to check if chat exists
export async function chatExists(chatId: string): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return false;
    }

    const userId = session.user.id;
    return await ChatStore.chatExists(chatId, userId);
  } catch (error) {
    console.error('Check chat exists error:', error);
    return false;
  }
}

// Server action to get models (optimized for SSR)
export const getModels = cache(async function getModels(): Promise<Model[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const userId = session.user.id;

    const eff = await getEffectivePermissionsForUser(userId)
    if (!eff.workspace.models) return []

    // Load recent models and filter by access control (owner, user_ids, group_ids, or admin)
    const modelsRaw = await db.model.findMany({
      orderBy: { updatedAt: 'desc' },
    })
    const models = await filterModelsReadableByUser(userId, modelsRaw)

    // Filter by connections config (disabled providers)
    const connectionsCfg = await getConnectionsConfig()
    const activeOllamaNames = computeProviderEnabled(connectionsCfg, 'ollama')
      ? await getActiveOllamaModelNames(connectionsCfg)
      : new Set<string>()

    const filtered = models

    // Map database models to Model type, annotate active Ollama models
    return filtered.map(model => {
      const meta = (model.meta as unknown) as ModelMeta
      const isOllama = String((meta as any)?.ownedBy || '').toLowerCase() === 'ollama'
      const name = (model as any).name as string
      const runtimeActive = isOllama && activeOllamaNames.has(name)
      const nextMeta = runtimeActive
        ? ({
            ...meta,
            details: { ...(meta?.details as any || {}), runtime_active: true }
          } as ModelMeta)
        : meta
      return {
        ...(model as any),
        meta: nextMeta,
      } as Model
    });
  } catch (error) {
    console.error('Get models error:', error);
    return [];
  }
});

// Lightweight active models loader for hot paths (no Ollama status probe, minimal fields)
export const getActiveModelsLight = cache(async function getActiveModelsLight(): Promise<Model[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const userId = session.user.id;

    const eff = await getEffectivePermissionsForUser(userId)
    if (!eff.workspace.models) return []

    // Fetch only essential fields and only active models; avoid large JSON columns
    const modelsRaw = await db.model.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        isActive: true,
        meta: true,
        userId: true,
        // Prisma field name is accessControl (mapped to access_control column)
        accessControl: true,
      } as any,
    })

    const models = await filterModelsReadableByUser(userId, modelsRaw as any)

    // Map to Model type with meta passthrough; skip runtime annotations
    return models.map((m: any) => ({
      ...m,
      meta: (m.meta as unknown) as ModelMeta,
    })) as Model[]
  } catch (error) {
    console.error('Get active models (light) error:', error);
    return [];
  }
});

// Server action to get user chats for initial page
export const getInitialChats = cache(async function getInitialChats() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return [];
    }

    const userId = session.user.id;
    const page = await ChatStore.getUserChatsPage(userId, { offset: 0, limit: 100 });
    return page.items;
  } catch (error) {
    console.error('Get initial chats error:', error);
    return [];
  }
});

// Server action to archive a chat
export async function archiveChatAction(chatId: string): Promise<void> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    await ChatStore.archiveChat({ chatId, userId });
    revalidatePath('/');
    revalidatePath('/archive');
  } catch (error) {
    console.error('Archive chat error:', error);
    throw error;
  }
}

// Server action to unarchive a chat
export async function unarchiveChatAction(chatId: string): Promise<void> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;
    await ChatStore.unarchiveChat({ chatId, userId });
    revalidatePath('/');
    revalidatePath('/archive');
  } catch (error) {
    console.error('Unarchive chat error:', error);
    throw error;
  }
}

// Helper function to get assistant display info from model
function getAssistantDisplayInfo(model: any): { displayName: string; imageUrl: string } {
  return {
    displayName: model?.name || 'AI Assistant',
    imageUrl: model?.meta?.profile_image_url || '/avatars/01.png'
  };
}

// Server action to create initial chat with message
export async function createInitialChat(message: string, modelId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    // Get model info for assistant display
    const model = await db.model.findFirst({
      where: {
        id: modelId,
        userId: userId,
      },
    });

    const assistantInfo = getAssistantDisplayInfo(model);

    // Create a new chat with the initial message
    const chatId = await ChatStore.createChat({ 
      userId, 
      initialMessage: {
        id: `msg_${Date.now()}`,
        role: 'user',
        parts: [{ type: 'text', text: message }],
        metadata: {
          createdAt: Date.now(),
          assistantDisplayName: assistantInfo.displayName,
          assistantImageUrl: assistantInfo.imageUrl,
          model: {
            id: modelId,
            name: model?.name || 'Unknown Model',
            profile_image_url: (model?.meta as any)?.profile_image_url || null,
          }
        }
      }
    });

    // Ensure the layout for this chat route is revalidated without affecting other paths
    try { revalidatePath(`/c/${chatId}`, 'layout') } catch {}

    return {
      chatId,
      modelId,
      assistantDisplayName: assistantInfo.displayName,
      assistantImageUrl: assistantInfo.imageUrl
    };
  } catch (error) {
    console.error('Create initial chat error:', error);
    throw error;
  }
}

// Server action to get a single model by ID
export async function getModelById(modelId: string): Promise<Model | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    const model = await db.model.findFirst({
      where: {
        id: modelId,
        userId: userId,
      },
    });

    return model ? {
      ...model,
      meta: (model.meta as unknown) as ModelMeta,
    } : null;
  } catch (error) {
    console.error('Get model by ID error:', error);
    throw error;
  }
}

// Server action to update a model
export async function updateModel(modelId: string, data: UpdateModelData): Promise<Model> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    // Check if model exists and belongs to user
    const existingModel = await db.model.findFirst({
      where: {
        id: modelId,
        userId: userId,
      },
    });

    if (!existingModel) {
      throw new Error('Model not found');
    }

    // Merge meta JSON instead of overwriting the entire column
    const mergedUpdate: any = {}
    if (typeof data.name !== 'undefined') mergedUpdate.name = data.name
    if (typeof data.isActive !== 'undefined') mergedUpdate.isActive = data.isActive
    if (Object.prototype.hasOwnProperty.call(data, 'meta')) {
      const currentMeta = (existingModel.meta as any) || {}
      const incomingMeta = (data.meta as any) || {}
      mergedUpdate.meta = { ...currentMeta, ...incomingMeta }
    }
    if (Object.prototype.hasOwnProperty.call(data, 'params')) {
      mergedUpdate.params = (data as any).params
    }

    const updatedModel = await db.model.update({
      where: { id: modelId },
      data: mergedUpdate,
    });

    revalidatePath('/admin/models');
    revalidatePath('/');

    return {
      ...updatedModel,
      meta: (updatedModel.meta as unknown) as ModelMeta,
    };
  } catch (error) {
    console.error('Update model error:', error);
    throw error;
  }
}

// Server action to toggle model active status
export async function toggleModelActive(modelId: string, isActive: boolean): Promise<Model> {
  return await updateModel(modelId, { isActive });
}

// Server action to update models visibility (batch operation)
export async function updateModelsVisibility(modelUpdates: { id: string; hidden: boolean }[]): Promise<Model[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id;

    // Process updates in parallel
    const updatePromises = modelUpdates.map(async ({ id, hidden }) => {
      const existingModel = await db.model.findFirst({
        where: {
          id: id,
          userId: userId,
        },
      });

      if (!existingModel) {
        throw new Error(`Model ${id} not found`);
      }

      // Update model meta and active status
      const updatedMeta = {
        ...(existingModel.meta as any || {}),
        hidden,
      };

      const updatedModel = await db.model.update({
        where: { id: id },
        data: {
          meta: updatedMeta,
          isActive: hidden ? false : existingModel.isActive,
        },
      });

      return {
        ...updatedModel,
        meta: updatedMeta as ModelMeta,
      };
    });

    const results = await Promise.all(updatePromises);

    revalidatePath('/admin/models');
    revalidatePath('/');

    return results;
  } catch (error) {
    console.error('Update models visibility error:', error);
    throw error;
  }
}

// Server action to get grouped models by owner
export async function getGroupedModels(): Promise<ModelsGroupedByOwner> {
  try {
    const models = await getModels();

    return models.reduce((groups, model) => {
      const owner = model.meta?.ownedBy || 'unknown';
      if (!groups[owner]) {
        groups[owner] = [];
      }
      groups[owner].push(model);
      return groups;
    }, {} as ModelsGroupedByOwner);
  } catch (error) {
    console.error('Get grouped models error:', error);
    return {};
  }
}

// Server action to get active models only (filtered for chat usage)
export async function getActiveModels(): Promise<Model[]> {
  try {
    const models = await getModels();
    return models.filter(model => model.isActive && !model.meta?.hidden);
  } catch (error) {
    console.error('Get active models error:', error);
    return [];
  }
}

// Admin-specific server actions for model management
export async function adminGetModels(): Promise<Model[]> {
  return await getModels();
}

export async function adminGetGroupedModels(): Promise<ModelsGroupedByOwner> {
  return await getGroupedModels();
}

export async function adminToggleModelActive(modelId: string, isActive: boolean): Promise<Model> {
  return await toggleModelActive(modelId, isActive);
}

export async function adminUpdateModelsVisibility(modelUpdates: { id: string; hidden: boolean }[]): Promise<Model[]> {
  return await updateModelsVisibility(modelUpdates);
}

// User Settings Actions
export const getUserSettings = cache(async function getUserSettings() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.settings || {};
  } catch (error) {
    console.error('Error retrieving user settings:', error);
    throw error;
  }
});

export async function updateUserSettings(settings: Record<string, any>) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    // Validate that settings is an object
    if (typeof settings !== 'object' || settings === null) {
      throw new Error('Settings must be a valid JSON object');
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { settings },
      select: { settings: true, updatedAt: true }
    });

    return {
      settings: updatedUser.settings,
      updatedAt: updatedUser.updatedAt.toISOString()
    };
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
}
