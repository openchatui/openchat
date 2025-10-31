
import { tool } from 'ai';
import { z } from 'zod';
import { ImageGenerationService } from './image.service';
import { ImageGenerationInputSchema } from './image.types';

/**
 * OpenAI Image Generation Provider
 */
export class OpenAIImageProvider {
  /**
   * Create AI SDK tool for image generation
   */
  static createTool() {
    return tool({
      description: 'Generate an image from a text prompt using OpenAI DALL-E',
      inputSchema: ImageGenerationInputSchema,
      execute: async (input: any) => {
        try {
          const result = await ImageGenerationService.generateImage(input);
          
          const summaryParts = [
            'image generated',
            `(model ${result.model})`,
            result.size,
          ];

          return {
            summary: summaryParts.join(' '),
            url: result.url || '',
            details: {
              model: result.model,
              size: result.size,
              quality: result.quality,
              style: result.style,
              revisedPrompt: result.revisedPrompt,
            },
          };
        } catch (error: any) {
          throw new Error(`Image generation failed: ${error.message}`);
        }
      },
    });
  }
}

/**
 * Legacy-compatible export
 */
export const openaiImageTools = {
  generateImage: OpenAIImageProvider.createTool(),
};
