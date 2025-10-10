import { UIMessage } from 'ai';
import { z } from 'zod';

// Metadata attached to each message (see ai-sdk message metadata docs)
export const messageModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  profile_image_url: z.string().nullable().optional(),
});

export const messageMetadataSchema = z.object({
  createdAt: z.number().optional(),
  model: messageModelSchema.optional(),
  totalTokens: z.number().optional(),
  assistantDisplayName: z.string().optional(),
  assistantImageUrl: z.string().optional(),
  reasoningActive: z.boolean().optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type AppUIMessage = UIMessage<MessageMetadata>;

export interface ChatData {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: AppUIMessage[];
  archived: boolean;
  tags: string[];
  modelId: string | null;
}

export interface SelectedModelInfo {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  profile_image_url?: string | null;
}

export interface ModelResolutionArgs {
  userId: string;
  modelId?: string | null;
  messages: AppUIMessage[];
  defaultModelName?: string;
}

export interface ResolvedModelInfo {
  selectedModelInfo: SelectedModelInfo | null;
  modelName: string;
  modelHandle: string;
  modelContextTokens?: number | null;
  providerModelId?: string;
}

export interface GenerationRequest {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  seed?: number;
  stopSequences?: string[];
  advanced?: AdvancedControls;
}

export interface AdvancedControls {
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'tool'; toolName: string };
}

export interface RawParamsRecord {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  seed?: number;
  stopSequences?: string[];
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'tool'; toolName: string };
  systemPrompt?: string;
}

export interface NormalizedModelParams extends RawParamsRecord {
  // All fields are optional and match RawParamsRecord
}

export interface StreamArgs {
  originalMessages: AppUIMessage[];
  selectedModelInfo: SelectedModelInfo | null;
  persistParams: { finalChatId: string; userId: string };
  extraStartMetadata?: Record<string, unknown>;
}

export interface SaveMessagesParams {
  messages: AppUIMessage[];
  selectedModelInfo: SelectedModelInfo | null;
  finalChatId: string;
  userId: string;
}

export interface ModelParamsInput {
  userId: string;
  modelId?: string;
  selectedModelId?: string | null;
  modelName?: string;
}

export interface ChatPreparationInput {
  userId: string;
  chatId?: string;
  message?: AppUIMessage;
  messages?: AppUIMessage[];
}

export interface PreparedChat {
  finalChatId: string;
  finalMessages: AppUIMessage[];
}

export interface SystemPromptInput {
  systemForModel?: string;
  enableWebSearch?: boolean;
  enableImage?: boolean;
  enableVideo?: boolean;
}

export interface ToolOptions {
  enableWebSearch?: boolean;
  enableImage?: boolean;
  enableVideo?: boolean;
}

export interface CreateChatParams {
  userId: string;
  initialMessage?: UIMessage;
  chatId?: string;
}

export interface SaveChatParams {
  chatId: string;
  userId: string;
  messages: UIMessage[];
}

export interface LoadChatParams {
  chatId: string;
  userId: string;
}

export interface UpdateChatTitleParams {
  chatId: string;
  userId: string;
  title: string;
}

export interface ArchiveChatParams {
  chatId: string;
  userId: string;
}

