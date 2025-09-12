"use client"

import { Session } from "next-auth"
import { AdminSidebar } from "../AdminSidebar"

// Models Panel Content
import { Card, CardContent } from "@/components/ui/card"
import { AnimatedLoader } from "@/components/ui/loader"
import { ModelsByOwner } from "./models-by-owner"
import { adminToggleModelActive, adminUpdateModelsVisibility } from "@/actions/chat"
import { useState, useCallback } from "react"
import type { Model } from "@/types/models"

// Main Admin Models Component
interface AdminModelsProps {
    session: Session | null
    initialModels?: Model[]
    initialGroupedModels?: Record<string, Model[]>
}

export function AdminModels({ session, initialModels = [], initialGroupedModels = {} }: AdminModelsProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  // Use server-loaded models
  const models = initialModels
  const groupedModels = initialGroupedModels
  const isLoading = false // Models are pre-loaded on server

  // Wrap server actions with loading state management
  const toggleModelActive = useCallback(async (modelId: string, isActive: boolean) => {
    setUpdatingIds(prev => new Set(prev).add(modelId))
    try {
      await adminToggleModelActive(modelId, isActive)
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(modelId)
        return newSet
      })
    }
  }, [])

  const updateModelsVisibility = useCallback(async (modelUpdates: { id: string; hidden: boolean }[]) => {
    // Add all model IDs to updating set
    setUpdatingIds(prev => new Set([...prev, ...modelUpdates.map(update => update.id)]))
    try {
      await adminUpdateModelsVisibility(modelUpdates)
    } finally {
      // Remove all model IDs from updating set
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        modelUpdates.forEach(update => newSet.delete(update.id))
        return newSet
      })
    }
  }, [])

  const ownerKeys = Object.keys(groupedModels).filter(owner => (groupedModels[owner] || []).length > 0).sort()

    return (
        <AdminSidebar session={session} activeTab="models">
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
              <AnimatedLoader size="lg" message="Loading models..." />
            </CardContent>
          </Card>
        ) : models.length === 0 ? (
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
                models={groupedModels[owner] || []}
                updatingIds={updatingIds}
                onToggleActive={toggleModelActive}
                onUpdateModels={updateModelsVisibility}
              />
            ))}
          </div>
        )}
      </div>
    </div>
        </AdminSidebar>
    )
}
