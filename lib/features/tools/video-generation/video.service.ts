import 'server-only';
import db from '@/lib/db';
import { ProviderService } from '@/lib/features/ai/providers/provider.service';
import OpenAI from 'openai';
import { getRootFolderId } from '@/lib/server/drive';
import { LOCAL_BASE_DIR } from '@/lib/server/drive/providers/local.service';
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

function pickContentExt(contentType: string | null | undefined): string {
  const ct = String(contentType || '').toLowerCase()
  if (ct.includes('webm')) return 'webm'
  if (ct.includes('quicktime') || ct.includes('mov')) return 'mov'
  if (ct.includes('m4v')) return 'm4v'
  return 'mp4'
}

function extractVideoUrl(json: any): string | null {
  if (!json || typeof json !== 'object') return null
  if (json.assets && typeof json.assets === 'object') {
    if (typeof json.assets.video === 'string' && json.assets.video) return json.assets.video
    if (Array.isArray(json.assets) && json.assets.length > 0) {
      const first = json.assets.find((a: any) => typeof a?.video === 'string')
      if (first?.video) return String(first.video)
    }
  }
  if (typeof json.url === 'string' && json.url) return json.url
  if (json.data && Array.isArray(json.data) && json.data[0]?.url) return String(json.data[0].url)
  const maybeContent = json.output || json.contents || json.content
  const arr = Array.isArray(maybeContent) ? maybeContent : []
  for (const item of arr) {
    const blocks = Array.isArray(item?.content) ? item.content : []
    for (const b of blocks) {
      if (b?.type === 'output_video' && typeof b?.video?.url === 'string') return b.video.url
      if (b?.type === 'video' && typeof b?.video?.url === 'string') return b.video.url
      if (typeof b?.url === 'string') return b.url
    }
  }
  return null
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
      model: configuredModel as any,
      size: configuredSize as any,
      seconds: configuredSeconds as any,
    } as any)

    // Always return job; defer downloading until status reaches 100%
    return { summary: 'video job accepted (no asset yet)', details: { job: created } }
  }
}


