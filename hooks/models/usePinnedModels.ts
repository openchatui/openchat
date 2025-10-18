"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getUserSettings, pinModels, unpinModels } from "@/lib/api/userSettings"
import { listModels } from "@/lib/api/models"
import type { Model } from "@/types/model.types"

interface UsePinnedModelsOptions {
  readonly allModels?: readonly Model[] | Model[]
  readonly initialPinnedModels?: readonly Model[] | Model[]
}

interface UsePinnedModelsResult {
  readonly pinnedIds: readonly string[]
  readonly pinnedModels: readonly Model[]
  readonly isLoading: boolean
  refresh: () => Promise<void>
  pin: (modelId: string) => Promise<void>
  unpin: (modelId: string) => Promise<void>
}

export function usePinnedModels(
  currentUserId?: string | null,
  options?: UsePinnedModelsOptions,
): UsePinnedModelsResult {
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [pinnedModels, setPinnedModels] = useState<Model[]>(() => {
    const initial = options?.initialPinnedModels
    return Array.isArray(initial) ? [...initial] : []
  })
  const [isLoading, setIsLoading] = useState(false)

  const allModels: Model[] | undefined = useMemo(() => {
    return Array.isArray(options?.allModels) ? [...options!.allModels] : undefined
  }, [options?.allModels])

  const refresh = useCallback(async () => {
    try {
      if (!currentUserId) return
      setIsLoading(true)
      const settings = await getUserSettings(currentUserId)
      const ids = settings.ui.pinned_models
      setPinnedIds(ids)

      const idSet = new Set(ids)
      if (idSet.size === 0) {
        setPinnedModels([])
        return
      }

      if (Array.isArray(allModels)) {
        setPinnedModels(allModels.filter((m) => idSet.has(m.id)))
      } else {
        const all = await listModels()
        setPinnedModels(all.filter((m) => idSet.has(m.id)))
      }
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId, allModels])

  useEffect(() => {
    // Initial load
    void refresh()
  }, [refresh])

  useEffect(() => {
    const handler = () => { void refresh() }
    window.addEventListener("pinned-models-updated", handler)
    return () => window.removeEventListener("pinned-models-updated", handler)
  }, [refresh])

  const pin = useCallback(async (modelId: string) => {
    if (!currentUserId || !modelId) return
    await pinModels(currentUserId, [modelId])
    setPinnedIds((prev) => Array.from(new Set([...(prev || []), modelId])))
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pinned-models-updated"))
    }
  }, [currentUserId])

  const unpin = useCallback(async (modelId: string) => {
    if (!currentUserId || !modelId) return
    await unpinModels(currentUserId, [modelId])
    setPinnedIds((prev) => prev.filter(id => id !== modelId))
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pinned-models-updated"))
    }
  }, [currentUserId])

  return { pinnedIds, pinnedModels, isLoading, refresh, pin, unpin }
}