import { z } from 'zod'

export const ChatPostSchema = z.object({
  messages: z.array(z.any()).optional(),
  message: z.any().optional(),
  modelId: z.string().optional(),
  chatId: z.string().optional(),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  maxOutputTokens: z.number().optional(),
  seed: z.number().optional(),
  stopSequences: z.array(z.string()).optional(),
  advanced: z.object({
    topK: z.number().optional(),
    presencePenalty: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    toolChoice: z.union([
      z.literal('auto'),
      z.literal('none'),
      z.literal('required'),
      z.object({ type: z.literal('tool'), toolName: z.string() }),
    ]).optional(),
  }).optional(),
  enableWebSearch: z.boolean().optional(),
  enableImage: z.boolean().optional(),
})

export type ChatPostBody = z.infer<typeof ChatPostSchema>


