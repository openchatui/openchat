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
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

export type AppUIMessage = UIMessage<MessageMetadata>;


