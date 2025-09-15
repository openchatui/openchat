import { NextResponse } from 'next/server'
import db from '@/lib/db'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ensureConnectionsConfigShape(data: any) {
  const defaults = {
    openai: {
      enable: false,
      api_base_urls: [] as string[],
      api_keys: [] as string[],
      api_configs: {} as Record<string, unknown>,
    },
    ollama: {
      enable: false,
      base_urls: [] as string[],
      api_configs: {} as Record<string, unknown>,
    },
    deepgram: {
      enable: false,
      api_keys: [] as string[],
      api_configs: {} as Record<string, unknown>,
    },
    elevenlabs: {
      enable: false,
      api_keys: [] as string[],
      api_configs: {} as Record<string, unknown>,
    },
  }

  const connections = isPlainObject(data?.connections) ? (data.connections as any) : {}

  const openai = isPlainObject(connections.openai) ? connections.openai : {}
  const ollama = isPlainObject(connections.ollama) ? connections.ollama : {}
  const deepgram = isPlainObject(connections.deepgram) ? connections.deepgram : {}
  const elevenlabs = isPlainObject(connections.elevenlabs) ? connections.elevenlabs : {}

  return {
    connections: {
      openai: {
        enable: typeof openai.enable === 'boolean' ? openai.enable : defaults.openai.enable,
        api_base_urls: Array.isArray(openai.api_base_urls) ? openai.api_base_urls : defaults.openai.api_base_urls,
        api_keys: Array.isArray(openai.api_keys) ? openai.api_keys : defaults.openai.api_keys,
        api_configs: isPlainObject(openai.api_configs) ? openai.api_configs : defaults.openai.api_configs,
      },
      ollama: {
        enable: typeof ollama.enable === 'boolean' ? ollama.enable : defaults.ollama.enable,
        base_urls: Array.isArray(ollama.base_urls) ? ollama.base_urls : defaults.ollama.base_urls,
        api_configs: isPlainObject(ollama.api_configs) ? ollama.api_configs : defaults.ollama.api_configs,
      },
      deepgram: {
        enable: typeof deepgram.enable === 'boolean' ? deepgram.enable : defaults.deepgram.enable,
        api_keys: Array.isArray(deepgram.api_keys) ? deepgram.api_keys : defaults.deepgram.api_keys,
        api_configs: isPlainObject(deepgram.api_configs) ? deepgram.api_configs : defaults.deepgram.api_configs,
      },
      elevenlabs: {
        enable: typeof elevenlabs.enable === 'boolean' ? elevenlabs.enable : defaults.elevenlabs.enable,
        api_keys: Array.isArray(elevenlabs.api_keys) ? elevenlabs.api_keys : defaults.elevenlabs.api_keys,
        api_configs: isPlainObject(elevenlabs.api_configs) ? elevenlabs.api_configs : defaults.elevenlabs.api_configs,
      },
    },
  }
}

// GET /api/connections/config - returns connections config, initializing if needed
export async function GET() {
  try {
    let config = await (db as any).config.findUnique({ where: { id: 1 } })
    if (!config) {
      const shaped = ensureConnectionsConfigShape({})
      config = await (db as any).config.create({ data: { id: 1, data: shaped } })
      return NextResponse.json(shaped)
    }

    const current = config.data || {}
    const shaped = ensureConnectionsConfigShape(current)

    const needsPersist = !isPlainObject((current as any).connections)
      || !isPlainObject((current as any).connections?.openai)
      || !isPlainObject((current as any).connections?.ollama)
      || !isPlainObject((current as any).connections?.deepgram)

    if (needsPersist) {
      const nextData = { ...current, ...shaped }
      await (db as any).config.update({ where: { id: 1 }, data: { data: nextData } })
    }

    return NextResponse.json(shaped)
  } catch (error) {
    console.error('GET /api/connections/config error:', error)
    return NextResponse.json({ error: 'Failed to fetch connections config' }, { status: 500 })
  }
}


