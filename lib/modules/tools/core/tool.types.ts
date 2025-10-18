import { z } from 'zod';

// Base tool interfaces
export interface ToolConfig {
  enabled: boolean;
  provider?: string;
  settings?: Record<string, unknown>;
}

export interface ToolResult {
  summary: string;
  url?: string;
  details?: Record<string, unknown>;
  error?: string;
}

export interface ToolExecutionContext {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

// Tool provider types
export type ToolProvider = 'openai' | 'browserless' | 'googlepse' | 'comfyui' | 'automatic1111' | 'pyodide';

export interface ProviderConfig {
  type: ToolProvider;
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
}

// Tool categories
export type ToolCategory = 'image-generation' | 'video-generation' | 'web-browsing' | 'text-processing' | 'data-analysis';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  provider: ToolProvider;
  inputSchema: z.ZodSchema;
  execute: (input: any, context?: ToolExecutionContext) => Promise<ToolResult>;
}

// Configuration schemas
export const ProviderConfigSchema = z.object({
  type: z.enum(['openai', 'browserless', 'googlepse', 'comfyui', 'automatic1111', 'pyodide']),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  enabled: z.boolean(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const ToolConfigSchema = z.object({
  enabled: z.boolean(),
  provider: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type ProviderConfigType = z.infer<typeof ProviderConfigSchema>;
export type ToolConfigType = z.infer<typeof ToolConfigSchema>;
