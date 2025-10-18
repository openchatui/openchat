import { tool } from 'ai';
import { z } from 'zod';
import { ToolService } from '../core/tool.service';
import type { ToolDefinition } from '../core/tool.types';
import { VideoGenerationService } from './video.service';
import { auth } from '@/lib/auth';

const VideoGenerationInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
});

const openaiVideoTool: ToolDefinition = {
  id: 'generateVideo',
  name: 'Generate Video',
  description: 'Generate a short video from a text prompt using OpenAI Sora 2',
  category: 'video-generation',
  provider: 'openai',
  inputSchema: VideoGenerationInputSchema,
  execute: async (input, context) => {
    let userId = String(context?.userId || '')
    if (!userId) {
      try {
        const session = await auth()
        userId = session?.user?.id ? String(session.user.id) : ''
      } catch {}
    }
    if (!userId) return { summary: 'User not authenticated', error: 'UNAUTHORIZED' } as any
    const result = await VideoGenerationService.generateWithOpenAI(userId, {
      prompt: input.prompt,
    })
    return { summary: result.summary, url: result.url || '', details: result.details } as any
  }
}

export function registerVideoTools(): void {
  ToolService.registerTool(openaiVideoTool);
}

export const openaiVideoTools = {
  generateVideo: tool({
    description: openaiVideoTool.description,
    inputSchema: VideoGenerationInputSchema,
    execute: async (input: any, context?: any) => {
      const result = await openaiVideoTool.execute(input, context)
      return {
        summary: (result as any).summary,
        url: (result as any).url || '',
        details: (result as any).details || {},
      }
    }
  })
}

// Auto-register on import
registerVideoTools();


