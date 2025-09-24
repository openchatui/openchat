import 'server-only';
import db from '@/lib/db';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOllama } from 'ollama-ai-provider-v2';
import type {
  SupportedProvider,
  ProviderConnection,
  ProviderResolutionInput,
  ProviderResolutionResult,
  ModelRow,
} from './provider.types';

/**
 * AI Provider Service
 */
export class ProviderService {
  /**
   * Get connection configuration for a provider
   */
  static async getConnectionForProvider(provider: SupportedProvider): Promise<ProviderConnection | null> {
    try {
      // Select by Connection.provider per latest requirements
      const connection = await (db as any).connection.findFirst({
        where: { provider },
        select: { baseUrl: true, apiKey: true },
      });
      
      return connection || null;
    } catch (error) {
      console.error(`Error getting connection for provider ${provider}:`, error);
      return null;
    }
  }

  /**
   * Normalize provider name from string
   */
  static normalizeProviderName(raw?: string | null): SupportedProvider | null {
    const name = String(raw || '').toLowerCase();
    if (!name) return null;
    if (name.includes('openrouter')) return 'openrouter';
    if (name.includes('ollama')) return 'ollama';
    if (name.includes('openai')) return 'openai';
    if (name.includes('compatible')) return 'openai-compatible';
    return null;
  }

  /**
   * Infer provider from hints in model name or URL
   */
  static inferProviderFromHints(hint?: string | null): SupportedProvider | null {
    const s = String(hint || '').toLowerCase();
    if (!s) return null;
    if (s.includes('ollama') || s.includes('11434') || s.includes('localhost')) return 'ollama';
    if (s.includes('openrouter')) return 'openrouter';
    if (s.includes('openai') || s.includes('/v1')) return 'openai';
    return null;
  }

  /**
   * Create OpenAI provider instance
   */
  static createOpenAIProvider(connection: ProviderConnection) {
    return createOpenAI({
      apiKey: connection.apiKey || undefined,
      baseURL: connection.baseUrl || undefined,
    });
  }

  /**
   * Create OpenRouter provider instance
   */
  static createOpenRouterProvider(connection: ProviderConnection) {
    return createOpenRouter({
      apiKey: connection.apiKey || undefined,
      ...(connection.baseUrl ? { baseURL: connection.baseUrl } : {}),
    });
  }

  /**
   * Create Ollama provider instance
   */
  static createOllamaProvider(connection: ProviderConnection) {
    const raw = (connection.baseUrl || 'http://localhost:11434').trim();
    const trimmed = raw.replace(/\/+$/, '');
    const withApi = /\/api\/?$/.test(trimmed) ? trimmed : `${trimmed}/api`;
    
    return createOllama({ baseURL: withApi });
  }

  /**
   * Resolve AI provider and model handle
   */
  static async resolveAiProvider(input: ProviderResolutionInput): Promise<ProviderResolutionResult> {
    const requestedModel = input.model && String(input.model).trim().length > 0
      ? String(input.model).trim()
      : 'gpt-4o-mini';

    // STRICT: resolve model by id ONLY (avoid name/provider which can be stripped/misleading)
    const modelRow = await (db as any).model.findFirst({
      where: { id: requestedModel },
      select: { id: true, meta: true },
    }) as any as ({ id: string; meta: unknown } | null);

    // Infer provider strictly from model.id (or from the requested string if not found)
    const idHint = modelRow?.id || requestedModel;
    const inferredProvider: SupportedProvider =
      this.inferProviderFromHints(idHint) ||
      'openai';

    // Provider-specific model id: prefer meta override, else use id only
    const providerModelId =
      (modelRow?.meta as any)?.provider_model_id ||
      idHint;

    const connection = await this.getConnectionForProvider(inferredProvider);
    if (!connection) {
      throw new Error(`No connection configured for provider '${inferredProvider}'.`);
    }

    // Validate API key presence when required
    const requiresKey = inferredProvider === 'openai' || 
                       inferredProvider === 'openai-compatible' || 
                       inferredProvider === 'openrouter';
    
    if (requiresKey && (!connection?.apiKey || String(connection.apiKey).trim() === '')) {
      throw new Error(`Missing API key for provider '${inferredProvider}'. Add a connection with an apiKey.`);
    }

    // Build provider factory
    if (inferredProvider === 'ollama') {
      const ollama = this.createOllamaProvider(connection);
      return {
        providerName: 'ollama',
        getModelHandle: (id: string) => ollama(id),
        providerModelId,
        baseUrl: connection.baseUrl,
      };
    }

    if (inferredProvider === 'openrouter') {
      const openrouter = this.createOpenRouterProvider(connection);
      return {
        providerName: 'openrouter',
        getModelHandle: (id: string) => openrouter(id),
        providerModelId,
        baseUrl: connection.baseUrl || 'https://openrouter.ai/api/v1',
      };
    }

    // Default to OpenAI-compatible
    const openai = this.createOpenAIProvider(connection);
    return {
      providerName: (inferredProvider === 'openai-compatible' ? 'openai-compatible' : 'openai'),
      getModelHandle: (id: string) => openai(id),
      providerModelId,
      baseUrl: connection.baseUrl,
    };
  }
}

// Export individual functions for legacy compatibility
export const resolveAiProvider = ProviderService.resolveAiProvider;
