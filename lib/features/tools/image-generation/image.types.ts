import { z } from 'zod';

// Image generation specific types
export interface ImageGenerationConfig {
  provider: 'openai' | 'comfyui' | 'automatic1111';
  model: string;
  size: string;
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  apiKey?: string;
  baseUrl?: string;
}

export interface ImageGenerationResult {
  url: string;
  localPath?: string;
  revisedPrompt?: string;
  model: string;
  size: string;
  quality?: string;
  style?: string;
}

// Schemas
export const ImageGenerationInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  style: z.enum(['vivid', 'natural']).optional(),
  model: z.string().optional(),
});

export const OpenAIImageConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().url().optional(),
  model: z.enum(['dall-e-2', 'dall-e-3', 'gpt-image-1']).default('dall-e-3'),
  size: z.string().default('1024x1024'),
  quality: z.enum(['standard', 'hd']).default('hd'),
});

export type ImageGenerationInput = z.infer<typeof ImageGenerationInputSchema>;
export type OpenAIImageConfig = z.infer<typeof OpenAIImageConfigSchema>;
