import 'server-only';
import db from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { 
  ImageGenerationConfig, 
  ImageGenerationResult, 
  ImageGenerationInput,
  OpenAIImageConfig 
} from './image.types';
import { OpenAIImageConfigSchema } from './image.types';

/**
 * Image Generation Service
 */
export class ImageGenerationService {
  /**
   * Save base64 image data to public directory
   */
  static async saveBase64ImageToPublic(
    base64Data: string, 
    options?: { subdir?: string; filenamePrefix?: string }
  ): Promise<{ url: string; filePath: string } | null> {
    try {
      const subdir = options?.subdir || 'images';
      const prefix = (options?.filenamePrefix || 'img').replace(/[^a-zA-Z0-9_-]/g, '') || 'img';
      const publicDir = path.join(process.cwd(), 'public');
      const imagesDir = path.join(publicDir, subdir);
      
      await mkdir(imagesDir, { recursive: true });
      
      const filename = `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
      const filePath = path.join(imagesDir, filename);
      const buffer = Buffer.from(base64Data, 'base64');
      
      await writeFile(filePath, buffer);
      
      const url = `/${subdir}/${filename}`;
      return { url, filePath };
    } catch (error) {
      console.error('Error saving base64 image:', error);
      return null;
    }
  }

  /**
   * Get image generation configuration from database
   */
  static async getImageConfig(): Promise<OpenAIImageConfig | null> {
    try {
      const cfgRow = await (db as any).config.findUnique({ 
        where: { id: 1 }, 
        select: { data: true } 
      });
      
      const data = (cfgRow?.data || {}) as any;
      const image = data?.image || {};
      const connections = data?.connections || {};
      const openaiConn = connections?.openai || {};

      // Prefer explicit image configuration
      let config: Partial<OpenAIImageConfig> = {
        apiKey: image?.openai?.api_key,
        baseUrl: image?.openai?.base_url,
        model: image?.openai?.model,
      };

      // Fallback to connections configuration
      if (!config.apiKey && Array.isArray(openaiConn.api_keys)) {
        config.apiKey = openaiConn.api_keys.find((key: any) => 
          typeof key === 'string' && key.trim().length > 0
        );
      }

      if (!config.baseUrl && Array.isArray(openaiConn.api_base_urls)) {
        config.baseUrl = openaiConn.api_base_urls.find((url: any) => 
          typeof url === 'string' && url.trim().length > 0
        );
      }

      // Validate and return configuration
      const validatedConfig = OpenAIImageConfigSchema.safeParse(config);
      return validatedConfig.success ? validatedConfig.data : null;
    } catch (error) {
      console.error('Error getting image config:', error);
      return null;
    }
  }

  /**
   * Generate image using OpenAI API
   */
  static async generateWithOpenAI(
    input: ImageGenerationInput
  ): Promise<ImageGenerationResult> {
    const config = await this.getImageConfig();
    if (!config) {
      throw new Error('OpenAI image generation not configured');
    }

    const endpoint = `${config.baseUrl || 'https://api.openai.com/v1'}/images/generations`;
    
    const toStringOrUndefined = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);

    const normalizeQualityForModel = (
      modelId: string,
      requestedQuality: string | undefined
    ): string | undefined => {
      if (!requestedQuality || requestedQuality === 'auto') {
        // Omit to let server-side default choose best per model
        return undefined;
      }

      const model = modelId?.toLowerCase();
      const q = requestedQuality.toLowerCase();

      // gpt-image-1 supports: low, medium, high
      if (model.includes('gpt-image')) {
        if (q === 'low' || q === 'medium' || q === 'high') return q;
        if (q === 'standard') return 'medium';
        if (q === 'hd') return 'high';
        return undefined;
      }

      // dall-e-3 supports: standard, hd
      if (model.includes('dall-e-3')) {
        if (q === 'standard' || q === 'hd') return q;
        if (q === 'high') return 'hd';
        if (q === 'medium' || q === 'low') return 'standard';
        return undefined;
      }

      // dall-e-2 supports only: standard
      if (model.includes('dall-e-2')) {
        return 'standard';
      }

      // Unknown model: omit
      return undefined;
    };

    const requestBody = {
      model: input.model || config.model,
      prompt: input.prompt,
      size: input.size || config.size,
      n: 1,
      quality: normalizeQualityForModel(
        toStringOrUndefined(input.model) || config.model,
        toStringOrUndefined(input.quality) || toStringOrUndefined(config.quality)
      ),
      style: input.style,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} ${errorText.slice(0, 500)}`);
    }

    const json = await response.json();
    const imageData = json.data?.[0];
    
    if (!imageData) {
      throw new Error('No image data returned from OpenAI API');
    }

    let url = imageData.url || '';
    let localPath: string | undefined;

    // If base64 data is provided instead of URL, save it locally
    if (!url && imageData.b64_json) {
      const saved = await this.saveBase64ImageToPublic(imageData.b64_json, {
        subdir: 'images',
        filenamePrefix: 'openai'
      });
      if (saved) {
        url = saved.url;
        localPath = saved.filePath;
      }
    }

    return {
      url,
      localPath,
      revisedPrompt: imageData.revised_prompt,
      model: requestBody.model,
      size: requestBody.size,
      quality: requestBody.quality,
      style: requestBody.style,
    };
  }

  /**
   * Generate image with automatic provider selection
   */
  static async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    // For now, only OpenAI is supported
    // This can be extended to support other providers
    return await this.generateWithOpenAI(input);
  }
}

/**
 * Image Provider Service
 */
export class ImageProviderService {
  /**
   * Check if image generation is available
   */
  static async isImageGenerationAvailable(): Promise<boolean> {
    try {
      const config = await ImageGenerationService.getImageConfig();
      return config !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get available image models
   */
  static async getAvailableModels(): Promise<string[]> {
    const config = await ImageGenerationService.getImageConfig();
    if (!config) return [];

    // Return available OpenAI models
    return ['dall-e-2', 'dall-e-3', 'gpt-image-1'];
  }

  /**
   * Get supported image sizes for a model
   */
  static getSupportedSizes(model: string): string[] {
    switch (model) {
      case 'dall-e-2':
        return ['256x256', '512x512', '1024x1024'];
      case 'dall-e-3':
      case 'gpt-image-1':
        return ['1024x1024', '1792x1024', '1024x1792'];
      default:
        return ['1024x1024'];
    }
  }
}
