import 'server-only';
import { ConfigDbService } from './db.service';
import type { AudioConfig, SystemConfig } from './types';

// System Configuration Service
export class ConfigService {
  /**
   * Get configuration value by path
   */
  static async getConfig<T = unknown>(path?: string): Promise<T | undefined> {
    try {
      const data = await ConfigDbService.getRawConfig();
      
      if (!path) return data as T;
      
      // Navigate to nested path (e.g., "websearch.browserless.apiKey")
      const keys = path.split('.');
      let current: unknown = data;
      
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          return undefined;
        }
      }
      
      return current as T;
    } catch (error) {
      console.error('Error getting config:', error);
      return undefined;
    }
  }

  /**
   * Update configuration
   */
  static async updateConfig(path: string, value: unknown): Promise<void> {
    try {
      const data = await ConfigDbService.getRawConfig();
      
      // Set nested value
      const keys = path.split('.');
      let current: Record<string, unknown> = data;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      }
      
      current[keys[keys.length - 1]] = value;

      await ConfigDbService.updateConfig(data);
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
      const websearch = await this.getConfig<SystemConfig['websearch']>('websearch');
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
      const image = await this.getConfig<SystemConfig['image']>('image');
      const connections = await this.getConfig<SystemConfig['connections']>('connections');
      
      const provider = image?.provider || 'openai';
      if (provider !== 'openai') return false;

      // Check for image-specific API key
      if (image?.openai?.api_key?.trim()) return true;

      // Check for general OpenAI connection
      const openaiConn = connections?.openai || {};
      const keys = Array.isArray(openaiConn.api_keys) ? openaiConn.api_keys : [];
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
      const audio = await this.getConfig<SystemConfig['audio']>('audio') || {};
      
      const ttsEnabled = Boolean(audio.ttsEnabled);
      const sttEnabled = Boolean(audio.sttEnabled);
      const ttsProv = typeof audio?.tts?.provider === 'string' ? audio.tts.provider : 'openai';
      const sttProv = typeof audio?.stt?.provider === 'string' ? audio.stt.provider : 'whisper-web';
      const whisperModel = typeof audio?.stt?.whisperWeb?.model === 'string' ? audio.stt.whisperWeb.model : '';

      return {
        ttsEnabled,
        sttEnabled,
        tts: { provider: (ttsProv === 'elevenlabs' ? 'elevenlabs' : 'openai') },
        stt: { 
          provider: (['openai', 'webapi', 'deepgram'].includes(sttProv) ? sttProv : 'whisper-web') as AudioConfig['stt']['provider'],
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
  static async getAllConfig(): Promise<SystemConfig> {
    return await ConfigDbService.getRawConfig();
  }

  /**
   * Reset configuration to defaults
   */
  static async resetConfig(): Promise<void> {
    await ConfigDbService.resetConfig();
  }
}

// Export individual functions for legacy compatibility
export const getWebSearchEnabled = ConfigService.getWebSearchEnabled;
export const getImageGenerationAvailable = ConfigService.getImageGenerationAvailable;
export const getAudioConfig = ConfigService.getAudioConfig;
