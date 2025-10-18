import 'server-only';
import db from '@/lib/db/client';
import type { SystemConfig } from './types';

// Data access layer for system configuration
export class ConfigDbService {
  private static readonly CONFIG_ID = 1;

  //Get raw configuration data
  static async getRawConfig(): Promise<SystemConfig> {
    const config = await db.config.findUnique({ 
      where: { id: this.CONFIG_ID }, 
      select: { data: true } 
    });
    return (config?.data || {}) as SystemConfig;
  }

  
  // Update configuration data  
  static async updateConfig(data: SystemConfig): Promise<void> {
    await db.config.upsert({
      where: { id: this.CONFIG_ID },
      create: { id: this.CONFIG_ID, data: data as any },
      update: { data: data as any }
    });
  }

  
  //Reset configuration to defaults  
  static async resetConfig(): Promise<void> {
    await this.updateConfig({});
  }
}
