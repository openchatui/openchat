export type SupportedProvider = 'openai' | 'openrouter' | 'ollama' | 'openai-compatible';

export interface ProviderConnection {
  baseUrl?: string;
  apiKey?: string | null;
}

export interface ProviderResolutionInput {
  /**
   * Incoming model identifier. The resolver will try in order:
   * 1) Models.provider_id == model
   * 2) Models.id == model (namespaced id)
   * 3) Models.name == model
   */
  model?: string;
}

export interface ProviderResolutionResult {
  providerName: SupportedProvider;
  // Function to obtain a model handle for ai.streamText
  getModelHandle: (providerModelId: string) => any;
  // Provider-specific model id to pass to provider
  providerModelId: string;
  // Base URL used for the provider
  baseUrl?: string;
}

export interface ModelRow {
  name: string;
  provider?: string | null;
  meta?: any;
  providerId?: string | null;
}
