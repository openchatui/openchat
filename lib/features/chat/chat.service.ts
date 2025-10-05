import 'server-only';
import { UIMessage, generateId } from 'ai';
import db from '@/lib/db';
import { ModelAccessService } from '@/lib/server';
import { ProviderService } from '@/lib/features/ai';
import { createBrowserlessTools } from '@/lib/features/tools';
import { openaiImageTools } from '@/lib/features/tools';
import { getWebSearchConfigAction } from '@/actions/websearch';
import type {
  ChatData,
  SelectedModelInfo,
  ModelResolutionArgs,
  ResolvedModelInfo,
  RawParamsRecord,
  NormalizedModelParams,
  ModelParamsInput,
  ChatPreparationInput,
  PreparedChat,
  SystemPromptInput,
  ToolOptions,
  CreateChatParams,
  SaveChatParams,
  LoadChatParams,
  UpdateChatTitleParams,
  ArchiveChatParams,
  MessageMetadata,
  AppUIMessage,
} from './chat.types';

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

/**
 * Chat Store Operations
 */
export class ChatStore {
  /**
   * Create a new chat in the database
   */
  static async createChat(params: CreateChatParams): Promise<string> {
    const { userId, initialMessage, chatId } = params;
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
  static async loadChat(params: LoadChatParams): Promise<UIMessage[] | null> {
    const { chatId, userId } = params;
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
  static async saveChat(params: SaveChatParams): Promise<void> {
    const { chatId, userId, messages } = params;
    
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
  static async getUserChats(userId: string): Promise<ChatData[]> {
    const chats = await db.chat.findMany({
      where: {
        userId,
        archived: 0,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        chat: true,
        createdAt: true,
        updatedAt: true,
        archived: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return chats.map(chat => {
      const raw = chat.chat as unknown;
      const messages = Array.isArray(raw) ? raw.filter(isUIMessage) as AppUIMessage[] : [];
      return {
        id: chat.id,
        userId: chat.userId,
        title: chat.title,
        messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        archived: chat.archived !== 0,
        tags: [],
        modelId: null,
      };
    });
  }

  /**
   * Get paginated chats for a user (for sidebar infinite scroll)
   */
  static async getUserChatsPage(
    userId: string,
    options: { offset?: number; limit?: number } = {}
  ): Promise<{ items: ChatData[]; nextOffset: number | null; hasMore: boolean; total: number }> {
    const rawOffset = Number.isFinite(options.offset as number) ? Number(options.offset) : 0;
    const rawLimit = Number.isFinite(options.limit as number) ? Number(options.limit) : 0;
    const offset = Math.max(0, rawOffset || 0);
    const limit = Math.min(Math.max(1, rawLimit || 100), 200);

    const where = {
      userId,
      archived: 0 as any,
    } as const;

    const total = await db.chat.count({ where: where as any });

    const chats = await db.chat.findMany({
      where: where as any,
      select: {
        id: true,
        userId: true,
        title: true,
        chat: true,
        createdAt: true,
        updatedAt: true,
        archived: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip: offset,
      take: limit,
    });

    const items = chats.map(chat => {
      const raw = chat.chat as unknown;
      const messages = Array.isArray(raw) ? raw.filter(isUIMessage) as AppUIMessage[] : [];
      return {
        id: chat.id,
        userId: chat.userId,
        title: chat.title,
        messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        archived: chat.archived !== 0,
        tags: [],
        modelId: null,
      } as ChatData;
    });

    const nextOffset = offset + items.length;
    const hasMore = nextOffset < total;
    return { items, nextOffset: hasMore ? nextOffset : null, hasMore, total };
  }

  /**
   * Get archived chats for a user
   */
  static async getUserArchivedChats(userId: string): Promise<ChatData[]> {
    const chats = await db.chat.findMany({
      where: {
        userId,
        archived: { not: 0 },
      },
      select: {
        id: true,
        userId: true,
        title: true,
        chat: true,
        createdAt: true,
        updatedAt: true,
        archived: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return chats.map(chat => {
      const raw = chat.chat as unknown;
      const messages = Array.isArray(raw) ? raw.filter(isUIMessage) as AppUIMessage[] : [];
      return {
        id: chat.id,
        userId: chat.userId,
        title: chat.title,
        messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        archived: chat.archived !== 0,
        tags: [],
        modelId: null,
      };
    });
  }

  /**
   * Check if a chat exists and belongs to the user
   */
  static async chatExists(chatId: string, userId: string): Promise<boolean> {
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
  static async deleteChat(params: ArchiveChatParams): Promise<void> {
    const { chatId, userId } = params;
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
  static async archiveChat(params: ArchiveChatParams): Promise<void> {
    const { chatId, userId } = params;
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
  static async unarchiveChat(params: ArchiveChatParams): Promise<void> {
    const { chatId, userId } = params;
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
  static async updateChatTitle(params: UpdateChatTitleParams): Promise<void> {
    const { chatId, userId, title } = params;
    await db.chat.updateMany({
      where: { id: chatId, userId },
      data: {
        title,
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Model Resolution Service
 */
export class ModelResolutionService {
  static async resolveModelInfoAndHandle(args: ModelResolutionArgs): Promise<ResolvedModelInfo> {
    const { userId, modelId, messages, defaultModelName = 'gpt-4o' } = args;
    let modelName = defaultModelName;
    let selectedModelInfo: SelectedModelInfo | null = null;
    let modelContextTokens: number | null = null;

    if (modelId) {
      const readable = await ModelAccessService.canReadModelById(userId, modelId);
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
            displayName: (model as any).meta?.displayName || model.name,
            provider: (model as any).meta?.provider || 'unknown',
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
        const m = messages[i] as AppUIMessage;
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
            displayName: (modelByName as any).meta?.displayName || modelByName.name,
            provider: (modelByName as any).meta?.provider || 'unknown',
            profile_image_url: (modelByName as any).meta?.profile_image_url ?? null,
          };
      }
    }

    if (!selectedModelInfo) {
      selectedModelInfo = { 
        id: modelName, 
        name: modelName, 
        displayName: modelName,
        provider: 'unknown',
        profile_image_url: null 
      };
    }

    if (selectedModelInfo?.name) {
      modelName = selectedModelInfo.name;
    }

    const { getModelHandle, providerModelId } = await ProviderService.resolveAiProvider({ model: modelId || modelName });
    const modelHandle = getModelHandle(providerModelId);

    return { selectedModelInfo, modelName, modelContextTokens, modelHandle, providerModelId };
  }
}

/**
 * Model Parameters Service
 */
export class ModelParametersService {
  static async fetchModelParams(input: ModelParamsInput): Promise<RawParamsRecord> {
    const { userId, modelId, selectedModelId, modelName } = input;

    const orClauses = [
      modelId ? { id: modelId } : null,
      selectedModelId ? { id: selectedModelId } : null,
      modelName ? { name: modelName } : null,
    ].filter(Boolean) as Array<{ id?: string; name?: string }>;

    if (orClauses.length === 0) return {};

    const m = await db.model.findFirst({
      where: { userId, OR: orClauses },
      select: { params: true, meta: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!m) return {};
    const params = ((m as any).params || {}) as RawParamsRecord;
    const meta = ((m as any).meta || {}) as Record<string, any>;

    // Legacy bridge: meta.system_prompt -> params.systemPrompt (only if missing)
    if ((params as any).systemPrompt === undefined) {
      const legacy = meta.system_prompt || meta?.details?.system_prompt;
      if (legacy && String(legacy).trim() !== '') {
        (params as any).systemPrompt = String(legacy);
      }
    }
    return params;
  }

  static normalizeModelParams(raw: RawParamsRecord): NormalizedModelParams {
    const get = <K extends keyof RawParamsRecord>(...keys: string[]) => {
      for (const k of keys) {
        const key = k as K;
        if (raw?.[key] !== undefined) return raw[key];
      }
      return undefined;
    };
    return {
      temperature: get('temperature') as number | undefined,
      topP: get('topP', 'top_p') as number | undefined,
      topK: get('topK', 'top_k') as number | undefined,
      seed: get('seed') as number | undefined,
      presencePenalty: get('presencePenalty', 'presence_penalty') as number | undefined,
      frequencyPenalty: get('frequencyPenalty', 'frequency_penalty') as number | undefined,
      maxOutputTokens: get('maxOutputTokens', 'max_output_tokens') as number | undefined,
      toolChoice: get('toolChoice', 'tool_choice') as any,
      stopSequences: get('stopSequences', 'stop_sequences', 'stop') as string[] | undefined,
      systemPrompt: get('systemPrompt', 'system_prompt') as string | undefined,
    };
  }
}

/**
 * Chat Preparation Service
 */
export class ChatPreparationService {
  static async prepareChatAndMessages(input: ChatPreparationInput): Promise<PreparedChat> {
    const { userId, chatId, message, messages } = input;
    let finalMessages: AppUIMessage[] = [];
    let finalChatId: string = chatId || '';

    if (message && chatId) {
      finalChatId = chatId;
      const exists = await ChatStore.chatExists(chatId, userId);
      if (!exists) {
        await ChatStore.createChat({ userId, chatId });
        finalMessages = [message];
      } else {
        const previousMessages = await ChatStore.loadChat({ chatId, userId });
        if (previousMessages === null) {
          throw new Error('Chat not found');
        }
        const previousMessagesTyped = previousMessages as unknown as AppUIMessage[];
        finalMessages = [...previousMessagesTyped, message];
      }
    } else if (messages && messages.length > 0) {
      finalMessages = messages;
      if (!chatId) {
        finalChatId = await ChatStore.createChat({ userId, initialMessage: messages[0] });
      }
    } else {
      throw new Error('Messages or message with chatId are required');
    }

    return { finalChatId, finalMessages };
  }
}

/**
 * System Prompt Service
 */
export class SystemPromptService {
  static async composeSystemPrompt(input: SystemPromptInput): Promise<string | undefined> {
    const { systemForModel, enableWebSearch, enableImage } = input;

    // Fetch optional prompts and provider from config (websearch/image)
    let DB_TOPLEVEL_WS_PROMPT = '';
    let DB_BROWSERLESS_PROMPT = '';
    let DB_GOOGLEPSE_PROMPT = '';
    let DB_IMAGE_SYSTEM_PROMPT = '';
    let WS_PROVIDER: 'browserless' | 'googlepse' = 'browserless';
    let BROWSERLESS_CONNECTED = false;
    try {
      const cfg = await (db as any).config.findUnique({ where: { id: 1 }, select: { data: true } });
      const data = (cfg?.data || {}) as any;
      const ws = (data?.websearch || {}) as any;
      const img = (data?.image || {}) as any;
      if (typeof ws?.SYSTEM_PROMPT === 'string') DB_TOPLEVEL_WS_PROMPT = String(ws.SYSTEM_PROMPT);
      if (typeof ws?.browserless?.systemPrompt === 'string') DB_BROWSERLESS_PROMPT = String(ws.browserless.systemPrompt);
      if (typeof ws?.googlepse?.systemPrompt === 'string') DB_GOOGLEPSE_PROMPT = String(ws.googlepse.systemPrompt);
      if (typeof img?.SYSTEM_PROMPT === 'string') DB_IMAGE_SYSTEM_PROMPT = String(img.SYSTEM_PROMPT);
      if (typeof ws?.PROVIDER === 'string') {
        const p = String(ws.PROVIDER).toLowerCase();
        WS_PROVIDER = (p === 'googlepse' ? 'googlepse' : 'browserless') as any;
      }
      if (typeof ws?.browserless?.apiKey === 'string' && ws.browserless.apiKey.trim().length > 0) {
        BROWSERLESS_CONNECTED = true;
      }
    } catch {}

    // Provider-specific defaults and envs
    const ENV_BROWSERLESS_SYSTEM_PROMPT = (process.env.BROWSERLESS_SYSTEM_PROMPT || '').trim();
    const DEFAULT_BROWSERLESS_SYSTEM_PROMPT = [
      'Web browsing tools are available (Browserless). Use them when helpful to fetch up-to-date information.',
      'Prefer: navigate -> listAnchors/listSelectors -> click/type/keyPress as needed. Summarize findings with URLs.',
      'Keep actions minimal, avoid unnecessary clicks, and stop when you have enough info. If you finish, call sessionEnd.',
      'Use navigate with thoughtfully crafted URLs (including query params) to reach targets efficiently.',
      'If a CAPTCHA appears, use captchaWait and report status; do not attempt to solve it yourself.',
    ].join(' ');

    const ENV_GOOGLEPSE_SYSTEM_PROMPT = (process.env.GOOGLEPSE_SYSTEM_PROMPT || '').trim();
    const DEFAULT_GOOGLEPSE_SYSTEM_PROMPT = [
      'Web search is available via Google Programmable Search Engine. Use it to retrieve sources and summarize findings.',
      'Favor precise queries and cite result titles and URLs. Avoid unnecessary requests.',
    ].join(' ');

    // Resolve provider-specific websearch prompt with precedence:
    // 1) Provider-specific DB prompt
    // 2) Top-level websearch SYSTEM_PROMPT (for backwards compatibility)
    // 3) Provider-specific ENV
    // 4) Provider-specific DEFAULT
    let resolvedWebSearchPrompt: string | '' = '';
    if (WS_PROVIDER === 'browserless') {
      const chosen = (DB_BROWSERLESS_PROMPT || DB_TOPLEVEL_WS_PROMPT || ENV_BROWSERLESS_SYSTEM_PROMPT || DEFAULT_BROWSERLESS_SYSTEM_PROMPT).trim();
      // Only apply Browserless guidance when connected
      resolvedWebSearchPrompt = BROWSERLESS_CONNECTED ? chosen : '';
    } else {
      resolvedWebSearchPrompt = (DB_GOOGLEPSE_PROMPT || DB_TOPLEVEL_WS_PROMPT || ENV_GOOGLEPSE_SYSTEM_PROMPT || DEFAULT_GOOGLEPSE_SYSTEM_PROMPT).trim();
    }

    const ENV_IMAGE_SYSTEM_PROMPT = (process.env.IMAGE_SYSTEM_PROMPT || '').trim();
    const DEFAULT_IMAGE_SYSTEM_PROMPT = [
      'Image generation tools are available. When the user requests an image, call the generateImage tool with the intended prompt text only.',
      'Once it\'s been generated say The image of "description of image" is done',
      'Do not include the link or location of the image.'
    ].join(' ');
    const imageSystemPrompt = (DB_IMAGE_SYSTEM_PROMPT.trim() || ENV_IMAGE_SYSTEM_PROMPT || DEFAULT_IMAGE_SYSTEM_PROMPT);

    const systemSegments = [
      systemForModel || undefined,
      enableWebSearch && resolvedWebSearchPrompt ? resolvedWebSearchPrompt : undefined,
      enableImage ? imageSystemPrompt : undefined,
    ].filter((s) => typeof s === 'string' && String(s).trim().length > 0) as string[];

    return systemSegments.length > 0 ? systemSegments.join('\n\n') : undefined;
  }
}

/**
 * Tools Service
 */
export class ToolsService {
  static async buildTools(options: ToolOptions): Promise<Record<string, unknown> | undefined> {
    const { enableWebSearch, enableImage } = options;
    const toolsEnabled = Boolean(enableWebSearch) || Boolean(enableImage);
    if (!toolsEnabled) return undefined;

    let webTools: Record<string, unknown> = {};
    if (enableWebSearch) {
      const ws = await getWebSearchConfigAction();
      if (ws.PROVIDER === 'googlepse') {
        const { createGooglePseTools } = await import('@/lib/features/tools/web-browsing/googlepse.tools');
        webTools = await createGooglePseTools() as any;
      } else {
        const bl = ws.browserless || {};
        const token = String(bl.apiKey || '');
        const tools = createBrowserlessTools({
          token,
          stealth: bl.stealth !== false,
          stealthRoute: bl.stealthRoute === true,
          blockAds: bl.blockAds === true,
          headless: bl.headless !== false,
          locale: bl.locale || 'en-US',
          timezone: bl.timezone || 'America/Los_Angeles',
          userAgent: bl.userAgent || undefined,
          route: typeof bl.route === 'string' && bl.route.trim().length > 0 ? String(bl.route) : undefined,
        });
        webTools = tools as any;
      }
    }

    return {
      ...webTools,
      ...(enableImage ? openaiImageTools : {}),
    } as any;
  }
}
