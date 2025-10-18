import { z } from "zod"
import { getJson, putJson } from "./http"

const UserSettingsSchema = z.object({
  ui: z.object({
    pinned_models: z.array(z.string()).optional(),
  }).optional(),
}).passthrough() // Allow other settings fields we don't care about here

export type NormalizedUserSettings = {
  ui: { pinned_models: string[] }
}

// Normalizes settings response to a consistent shape
function normalizeSettings(s: z.infer<typeof UserSettingsSchema>): NormalizedUserSettings {
  const list = (s.ui?.pinned_models ?? []).filter((v): v is string => typeof v === "string")
  return { ui: { pinned_models: list } }
}

// Gets user settings with pinned models
export async function getUserSettings(userId: string): Promise<NormalizedUserSettings> {
  const data = await getJson(
    `/api/v1/users/${userId}/settings`,
    { credentials: "include" },
    UserSettingsSchema,
  )
  return normalizeSettings(data)
}

// Updates all user settings
export async function updateUserSettings(userId: string, next: NormalizedUserSettings): Promise<void> {
  await putJson(`/api/v1/users/${userId}/settings`, next)
}

// Pins specific models to the sidebar
export async function pinModels(userId: string, modelIds: string[]): Promise<void> {
  if (modelIds.length === 0) return
  await putJson(`/api/v1/users/${userId}/settings/pinned`, { modelIds })
}

// Unpins specific models from the sidebar by updating the full settings
export async function unpinModels(userId: string, modelIdsToRemove: string[]): Promise<void> {
  if (modelIdsToRemove.length === 0) return
  const settings = await getUserSettings(userId)
  const next = {
    ...settings,
    ui: {
      ...settings.ui,
      pinned_models: settings.ui.pinned_models.filter(id => !modelIdsToRemove.includes(id)),
    },
  }
  await updateUserSettings(userId, next)
}
