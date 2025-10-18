import { tool } from 'ai';
import { ToolService } from '../core/tool.service';
import { ImageGenerationService } from './image.service';
import { ImageGenerationInputSchema } from './image.types';
import type { ToolDefinition } from '../core/tool.types';

/**
 * OpenAI Image Generation Tool
 */
const openaiImageTool: ToolDefinition = {
  id: 'generateImage',
  name: 'Generate Image',
  description: 'Generate an image from a text prompt using OpenAI DALL-E',
  category: 'image-generation',
  provider: 'openai',
  inputSchema: ImageGenerationInputSchema,
  execute: async (input) => {
    try {
      const result = await ImageGenerationService.generateImage(input);
      
      return {
        summary: `Image generated: "${input.prompt.slice(0, 50)}${input.prompt.length > 50 ? '...' : ''}"`,
        url: result.url,
        details: {
          model: result.model,
          size: result.size,
          quality: result.quality,
          style: result.style,
          revisedPrompt: result.revisedPrompt,
          localPath: result.localPath,
        }
      };
    } catch (error: any) {
      return {
        summary: `Image generation failed: ${error.message}`,
        error: error.message,
        details: {
          prompt: input.prompt,
          originalError: error.message
        }
      };
    }
  }
};

/**
 * Register image generation tools
 */
export function registerImageTools(): void {
  ToolService.registerTool(openaiImageTool);
}

/**
 * Get AI SDK compatible image tools (legacy compatibility)
 */
export const openaiImageTools = {
  generateImage: tool({
    description: openaiImageTool.description,
    inputSchema: openaiImageTool.inputSchema,
    execute: async (input: any) => {
      const result = await openaiImageTool.execute(input);
      return {
        summary: result.summary,
        url: result.url || '',
        details: result.details || {}
      };
    }
  })
};

// Auto-register tools when this module is imported
registerImageTools();
