"use client"

import { Session } from "next-auth"
import { AdminSidebar } from "../AdminSidebar"

// Models Panel Content
import { Card, CardContent } from "@/components/ui/card"
import { AnimatedLoader } from "@/components/ui/loader"
import { ModelsByOwner } from "./models-by-owner"
import { toggleModelActive as adminToggleModelActive, updateModelsVisibilityBatch as adminUpdateModelsVisibility, updateModel } from "@/lib/api/models"
import { useState, useCallback } from "react"
import { toast } from "sonner"
import type { Model } from '@/types/model.types'
import type { UpdateModelData } from '@/types/model.types'

// Main Admin Models Component
interface AdminModelsProps {
    session: Session | null
    initialModels?: Model[]
    initialGroupedModels?: Record<string, Model[]>
    initialModelsConfig?: { hidden: string[]; invisible: string[]; active: string[]; order: string[] }
    initialChats?: any[]
}

export function AdminModels({ session, initialModels = [], initialGroupedModels = {}, initialChats = [] }: AdminModelsProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [modelsByOwner, setModelsByOwner] = useState<Record<string, Model[]>>(initialGroupedModels)

  // Models are pre-loaded on server
  const isLoading = false

  // Optimistic toggle for model active state
  const toggleModelActive = useCallback(async (modelId: string, isActive: boolean) => {
    setUpdatingIds(prev => new Set(prev).add(modelId))

    // Optimistically update local state
    let previousIsActive = false
    setModelsByOwner(prev => {
      const next: Record<string, Model[]> = {}
      for (const owner in prev) {
        next[owner] = prev[owner].map(m => {
          if (m.id === modelId) {
            previousIsActive = m.isActive
            return { ...m, isActive }
          }
          return m
        })
      }
      return next
    })

    try {
      await adminToggleModelActive(modelId, isActive)
    } catch (error) {
      // Revert on failure and notify
      setModelsByOwner(prev => {
        const next: Record<string, Model[]> = {}
        for (const owner in prev) {
          next[owner] = prev[owner].map(m => (m.id === modelId ? { ...m, isActive: previousIsActive } : m))
        }
        return next
      })
      toast.error("Failed to update model status. Reverted change.")
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelId)
        return newSet
      })
    }
  }, [])

  // Optimistically update model visibility (hidden flag)
  const updateModelsVisibility = useCallback(async (modelUpdates: { id: string; hidden: boolean }[]) => {
    const updatedIds = modelUpdates.map(update => update.id)
    const hiddenById = new Map(modelUpdates.map(u => [u.id, u.hidden]))

    // Add all model IDs to updating set
    setUpdatingIds(prev => new Set([...prev, ...updatedIds]))

    // Capture previous values and apply optimistic update
    const previousHiddenById = new Map<string, boolean>()
    setModelsByOwner(prev => {
      const next: Record<string, Model[]> = {}
      for (const owner in prev) {
        next[owner] = prev[owner].map(m => {
          if (hiddenById.has(m.id)) {
            previousHiddenById.set(m.id, !!m.meta?.hidden)
            return { ...m, meta: { ...m.meta, hidden: hiddenById.get(m.id)! } }
          }
          return m
        })
      }
      return next
    })

    try {
      await adminUpdateModelsVisibility(modelUpdates)
    } catch (error) {
      // Revert on failure and notify
      setModelsByOwner(prev => {
        const next: Record<string, Model[]> = {}
        for (const owner in prev) {
          next[owner] = prev[owner].map(m => {
            if (previousHiddenById.has(m.id)) {
              return { ...m, meta: { ...m.meta, hidden: previousHiddenById.get(m.id)! } }
            }
            return m
          })
        }
        return next
      })
      toast.error("Failed to update model visibility. Reverted change.")
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        updatedIds.forEach(id => newSet.delete(id))
        return newSet
      })
    }
  }, [])

  const ownerKeys = Object.keys(modelsByOwner).filter(owner => (modelsByOwner[owner] || []).length > 0).sort()
  const totalModels = ownerKeys.reduce((acc, owner) => acc + (modelsByOwner[owner]?.length || 0), 0)

  // Optimistic update for model name/image
  const updateModelDetails = useCallback(async (modelId: string, data: UpdateModelData) => {
    setUpdatingIds(prev => new Set(prev).add(modelId))

    // Snapshot previous values and apply optimistic update
    let previous: { name?: string; profile_image_url?: string; tags?: string[]; system_prompt?: string; params?: any } | null = null
    setModelsByOwner(prev => {
      const next: Record<string, Model[]> = {}
      for (const owner in prev) {
        next[owner] = prev[owner].map(m => {
          if (m.id === modelId) {
            previous = { name: m.name, profile_image_url: m.meta?.profile_image_url ?? undefined, tags: m.meta?.tags ?? undefined, system_prompt: (m.meta as any)?.system_prompt ?? undefined, params: m.params }

            const nextMeta = { ...m.meta }
            if (data.meta) {
              if (Object.prototype.hasOwnProperty.call(data.meta, 'profile_image_url')) {
                ;(nextMeta as any).profile_image_url = (data.meta as any).profile_image_url
              }
              if (Object.prototype.hasOwnProperty.call(data.meta, 'tags')) {
                ;(nextMeta as any).tags = (data.meta as any).tags
              }
              if (Object.prototype.hasOwnProperty.call(data.meta, 'system_prompt')) {
                ;(nextMeta as any).system_prompt = (data.meta as any).system_prompt
              }
            }

            const updated: Model = {
              ...m,
              ...(data.name ? { name: data.name } : {}),
              meta: nextMeta as any,
              ...(Object.prototype.hasOwnProperty.call(data, 'params') ? { params: (data as any).params } : {}),
            }
            return updated
          }
          return m
        })
      }
      return next
    })

    try {
      await updateModel(modelId, data)
    } catch (error) {
      // Revert on failure
      if (previous) {
        setModelsByOwner(prev => {
          const next: Record<string, Model[]> = {}
          for (const owner in prev) {
            next[owner] = prev[owner].map(m => {
              if (m.id === modelId) {
                return {
                  ...m,
                  ...(previous?.name ? { name: previous.name } : {}),
                  meta: { ...m.meta, profile_image_url: previous?.profile_image_url ?? undefined, tags: previous?.tags, system_prompt: previous?.system_prompt ?? undefined },
                  ...(Object.prototype.hasOwnProperty.call(previous, 'params') ? { params: previous?.params } : {}),
                }
              }
              return m
            })
          }
          return next
        })
      }
      toast.error("Failed to save changes. Reverted.")
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelId)
        return newSet
      })
    }
  }, [])

    return (
            <div className="flex flex-col h-full">
      {/* Fixed header */}
      <div className="flex-shrink-0 space-y-6 pb-6">
        <div>
          <h2 className="text-2xl font-semibold">Models</h2>
          <p className="text-muted-foreground">
            Manage and configure AI models and providers
          </p>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AnimatedLoader className="h-10 w-10" message="Loading models..." />
            </CardContent>
          </Card>
        ) : totalModels === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">No models found</p>
                <p className="text-sm text-muted-foreground">
                  Sync models from your connections to get started
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 pr-2">
            {ownerKeys.map((owner) => (
              <ModelsByOwner
                key={owner}
                owner={owner}
                models={modelsByOwner[owner] || []}
                updatingIds={updatingIds}
                onToggleActive={toggleModelActive}
                onUpdateModels={updateModelsVisibility}
                onUpdateModel={updateModelDetails}
              />
            ))}
          </div>
        )}
      </div>
    </div>
        
    )
}
