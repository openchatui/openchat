import 'server-only';
import db from '../../db';

export interface AudioConfig {
  ttsEnabled: boolean;
  sttEnabled: boolean;
  tts: { provider: 'openai' | 'elevenlabs' };
  stt: { 
    provider: 'whisper-web' | 'openai' | 'webapi' | 'deepgram'; 
    whisperWeb: { model: string };
  };
}

/**
 * System Configuration Service
 */
export class ConfigService {
  /**
   * Get configuration value by path
   */
  static async getConfig(path?: string): Promise<any> {
    try {
      const config = await db.config.findUnique({ 
        where: { id: 1 }, 
        select: { data: true } 
      });
      
      const data = (config?.data || {}) as any;
      
      if (!path) return data;
      
      // Navigate to nested path (e.g., "websearch.browserless.apiKey")
      const keys = path.split('.');
      let current = data;
      
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          return undefined;
        }
      }
      
      return current;
    } catch (error) {
      console.error('Error getting config:', error);
      return undefined;
    }
  }

  /**
   * Update configuration
   */
  static async updateConfig(path: string, value: any): Promise<void> {
    try {
      const currentConfig = await this.getConfig();
      const data = currentConfig || {};
      
      // Set nested value
      const keys = path.split('.');
      let current = data;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }
      
      current[keys[keys.length - 1]] = value;

      await db.config.upsert({
        where: { id: 1 },
        create: { id: 1, data },
        update: { data }
      });
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  }

  /**
   * Check if web search is enabled
   */
  static async getWebSearchEnabled(): Promise<boolean> {
    try {
      const websearch = await this.getConfig('websearch');
      return Boolean(websearch?.ENABLED);
    } catch {
      return false;
    }
  }

  /**
   * Check if image generation is available
   */
  static async getImageGenerationAvailable(): Promise<boolean> {
    try {
      const image = await this.getConfig('image');
      const connections = await this.getConfig('connections');
      
      const provider = image?.provider || 'openai';
      if (provider !== 'openai') return false;

      // Check for image-specific API key
      if (image?.openai?.api_key?.trim()) return true;

      // Check for general OpenAI connection
      const openaiConn = connections?.openai || {};
      const keys: any[] = Array.isArray(openaiConn.api_keys) ? openaiConn.api_keys : [];
      return keys.some(k => typeof k === 'string' && k.trim().length > 0);
    } catch {
      return false;
    }
  }

  /**
   * Get audio configuration
   */
  static async getAudioConfig(): Promise<AudioConfig> {
    try {
      const audio = await this.getConfig('audio') || {};
      
      const ttsEnabled = Boolean(audio.ttsEnabled);
      const sttEnabled = Boolean(audio.sttEnabled);
      const ttsProv = typeof audio?.tts?.provider === 'string' ? audio.tts.provider : 'openai';
      const sttProv = typeof audio?.stt?.provider === 'string' ? audio.stt.provider : 'whisper-web';
      const whisperModel = typeof audio?.stt?.whisperWeb?.model === 'string' ? audio.stt.whisperWeb.model : '';

      return {
        ttsEnabled,
        sttEnabled,
        tts: { provider: (ttsProv === 'elevenlabs' ? 'elevenlabs' : 'openai') as 'openai' | 'elevenlabs' },
        stt: { 
          provider: (['openai', 'webapi', 'deepgram'].includes(sttProv) ? sttProv as any : 'whisper-web'), 
          whisperWeb: { model: whisperModel } 
        }
      };
    } catch {
      return { 
        ttsEnabled: false, 
        sttEnabled: false, 
        tts: { provider: 'openai' }, 
        stt: { provider: 'whisper-web', whisperWeb: { model: '' } } 
      };
    }
  }

  /**
   * Get all configuration
   */
  static async getAllConfig(): Promise<Record<string, any>> {
    return await this.getConfig() || {};
  }

  /**
   * Reset configuration to defaults
   */
  static async resetConfig(): Promise<void> {
    try {
      await db.config.upsert({
        where: { id: 1 },
        create: { id: 1, data: {} },
        update: { data: {} }
      });
    } catch (error) {
      console.error('Error resetting config:', error);
      throw error;
    }
  }
}

// Export individual functions for legacy compatibility
export const getWebSearchEnabled = ConfigService.getWebSearchEnabled;
export const getImageGenerationAvailable = ConfigService.getImageGenerationAvailable;
export const getAudioConfig = ConfigService.getAudioConfig;
