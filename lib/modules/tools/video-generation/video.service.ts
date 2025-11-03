
import db from '@/lib/db';
import { ProviderService } from '@/lib/modules/ai/providers/provider.service';
import OpenAI from 'openai';
import { getRootFolderId } from '@/lib/modules/drive';
import { LOCAL_BASE_DIR } from '@/lib/modules/drive/providers/local.service';
import { mkdir, writeFile, rename } from 'fs/promises';
import path from 'path';
import { randomUUID, createHash } from 'crypto';

export interface VideoGenerationInput {
  prompt: string;
}

export interface VideoGenerationResult {
  summary: string;
  url?: string;
  details?: Record<string, unknown>;
}

async function getVideoDefaults(): Promise<{ model: string; size: string; seconds: number }> {
  try {
    const row = await db.config.findUnique({ where: { id: 1 } })
    const data = (row?.data || {}) as any
    const video = (data && typeof data === 'object' && (data as any).video) ? (data as any).video : {}
    const openai = (video && typeof video.openai === 'object') ? video.openai as any : {}
    const model = typeof openai.model === 'string' && openai.model.trim().length > 0 ? openai.model : 'sora-2-pro'
    const size = typeof openai.size === 'string' && openai.size.trim().length > 0 ? openai.size : '1280x720'
    const seconds = Number.isFinite(openai.seconds) && openai.seconds > 0 ? Number(openai.seconds) : 4
    return { model, size, seconds }
  } catch {
    return { model: 'sora-2-pro', size: '1280x720', seconds: 4 }
  }
}

export class VideoGenerationService {
  static async generateWithOpenAI(userId: string, input: VideoGenerationInput): Promise<VideoGenerationResult> {
    const defaults = await getVideoDefaults()
    const conn = await ProviderService.getConnectionForProvider('openai')
    if (!conn?.apiKey) {
      throw new Error('OpenAI connection not configured')
    }
    const client = new OpenAI({ apiKey: conn.apiKey, ...(conn.baseUrl ? { baseURL: conn.baseUrl } : {}) })
    // Always use configured model/size/seconds from config; ignore tool input for these
    const configuredModel = defaults.model
    const configuredSize = defaults.size
    const allowedSeconds = new Set([4, 8, 12])
    const configuredSeconds = allowedSeconds.has(Number(defaults.seconds)) ? Number(defaults.seconds) : 4

    const created: any = await client.videos.create({
      prompt: input.prompt,
      model: configuredModel as string,
      size: configuredSize as string,
      // OpenAI Videos API expects seconds as a string union: '4' | '8' | '12'
      seconds: String(configuredSeconds) as string,
    } as any)

    // Always return job; defer downloading until status reaches 100%
    return { summary: 'video job accepted (no asset yet)', details: { job: created } }
  }
}


