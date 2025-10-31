import { z } from "zod"
import { getJson } from "./http"
import type { Model, UpdateModelData } from "@/types/model.types"
import { absoluteUrl, httpFetch } from './http'

const ModelMetaSchema = z.object({
  profile_image_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  tools: z.any().nullable().optional(),
  ownedBy: z.string(),
  details: z.any().nullable().optional(),
  hidden: z.boolean().nullable().optional(),
  system_prompt: z.string().nullable().optional(),
})

const ModelSchema = z.object({
  id: z.string(),
  userId: z.string(),
  providerId: z.string().optional(),
  provider: z.string().nullable().optional(),
  baseModelId: z.string().nullable(),
  name: z.string(),
  meta: ModelMetaSchema,
  params: z.any(),
  createdAt: z.number(),
  updatedAt: z.number(),
  isActive: z.boolean(),
  accessControl: z.any().optional(),
})

const ModelsResponseSchema = z.object({
  models: z.array(ModelSchema).default([]),
})

// Lists available models with metadata
export async function listModels(): Promise<Model[]> {
  const data = await getJson(`/api/v1/models`, { credentials: "include" }, ModelsResponseSchema)
  return data.models
}

// Gets a single model by ID
export async function getModel(modelId: string): Promise<Model | null> {
  const models = await listModels()
  return models.find(m => m.id === modelId || m.providerId === modelId) ?? null
}

export async function listActiveModelsLight(): Promise<Model[]> {
  const schema = z.object({ models: z.array(ModelSchema).default([]) })
  const data = await getJson(`/api/v1/models/active`, { credentials: 'include' }, schema)
  return data.models
}

export async function groupModelsByOwner(): Promise<Record<string, Model[]>> {
  const res = await httpFetch(absoluteUrl('/api/v1/models/grouped'), { method: 'GET' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error || 'Failed to fetch grouped models')
  }
  return await res.json()
}

export async function updateModel(modelId: string, data: UpdateModelData): Promise<Model> {
  const res = await httpFetch(absoluteUrl(`/api/v1/models/${encodeURIComponent(modelId)}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error((payload as any)?.error || 'Failed to update model')
  }
  return await res.json()
}

export async function toggleModelActive(modelId: string, isActive: boolean): Promise<Model> {
  return await updateModel(modelId, { isActive })
}

export async function updateModelsVisibilityBatch(updates: { id: string; hidden: boolean }[]): Promise<Model[]> {
  const res = await httpFetch(absoluteUrl('/api/v1/models/visibility'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error((payload as any)?.error || 'Failed to update model visibility')
  }
  const json = await res.json().catch(() => ({ models: [] }))
  return (json?.models || []) as Model[]
}