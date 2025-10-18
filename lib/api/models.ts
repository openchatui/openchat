import { z } from "zod"
import { getJson } from "./http"
import type { Model } from "@/types/model.types"

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