import { z } from "zod"
import { getJson, putJson } from "./http"
import { absoluteUrl, httpFetch } from './http'
import { auth } from "@/lib/auth"

const UserSettingsSchema = z.object({
  ui: z.object({
    pinned_models: z.array(z.string()).optional(),
    models: z.array(z.string()).optional(),
  }).optional(),
}).passthrough() // Allow other settings fields we don't care about here

export type NormalizedUserSettings = {
  ui: { pinned_models: string[]; models: string[] }
}

// Normalizes settings response to a consistent shape
function normalizeSettings(s: z.infer<typeof UserSettingsSchema>): NormalizedUserSettings {
  const pinned = (s.ui?.pinned_models ?? []).filter((v): v is string => typeof v === "string")
  const models = (s.ui?.models ?? []).filter((v): v is string => typeof v === "string")
  return { ui: { pinned_models: pinned, models } }
}

// Gets user settings with pinned models
export async function getUserSettings(userId: string): Promise<NormalizedUserSettings> {
  // Server-side optimization: call DB directly to avoid HTTP round-trip and auth issues
  if (typeof window === 'undefined') {
    try {
      const session = await auth()
      // Only bypass HTTP if the requesting user matches or is admin
      const sessionUser = session?.user as { id?: string; role?: string } | undefined
      const role = sessionUser?.role
      const isAdmin = typeof role === 'string' && role.toLowerCase() === 'admin'
      if (sessionUser?.id === userId || isAdmin) {
        const { getUserSettingsFromDb } = await import('@/lib/db/users.db')
        const data = await getUserSettingsFromDb(userId)
        return normalizeSettings(data)
      }
    } catch (err) {
      console.error('[getUserSettings] Direct DB call failed:', err)
      // Fall through to HTTP call
    }
  }
  
  // Client-side or fallback: use HTTP
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

// Updates arbitrary settings object (server-side convenience)
export async function updateUserSettingsRaw(userId: string, settings: Record<string, unknown>): Promise<{ settings: Record<string, unknown>; updatedAt: string }> {
  const res = await httpFetch(absoluteUrl(`/api/v1/users/${encodeURIComponent(userId)}/settings`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as any)?.error || 'Failed to update settings')
  }
  return await res.json().catch(() => ({ settings: {}, updatedAt: new Date().toISOString() }))
}

// Gets the raw user settings object (including integrations)
export async function getUserSettingsRaw(userId: string): Promise<Record<string, unknown>> {
  const res = await httpFetch(absoluteUrl(`/api/v1/users/${encodeURIComponent(userId)}/settings`), {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  })
  if (!res.ok) {
    return {}
  }
  try {
    return await res.json()
  } catch {
    return {}
  }
}
