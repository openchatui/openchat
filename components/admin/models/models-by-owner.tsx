"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings } from "lucide-react"
import { ModelItem } from "./model-item"
import { HideModelsDialog } from "./hide-models-dialog"
import type { Model } from "@/types/models"
import type { UpdateModelData } from "@/types/models"

interface ModelsByOwnerProps {
  owner: string
  models: Model[]
  updatingIds: Set<string>
  onToggleActive: (modelId: string, isActive: boolean) => void
  onUpdateModels: (modelUpdates: { id: string; hidden: boolean }[]) => Promise<void>
  onUpdateModel: (modelId: string, data: UpdateModelData) => Promise<void>
}

export function ModelsByOwner({ owner, models, updatingIds, onToggleActive, onUpdateModels, onUpdateModel }: ModelsByOwnerProps) {
  // Filter out hidden models for display, but pass all models to the dialog
  const visibleModels = models.filter(model => !model.meta?.hidden)

  return (
    <Card className="bg-transparent border-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span className="capitalize">{owner}</span>
            <Badge variant="secondary">{visibleModels.length}</Badge>
          </div>
          <HideModelsDialog
            owner={owner}
            models={models} // Pass all models to dialog
            onUpdateModels={onUpdateModels}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleModels.map((model) => (
          <ModelItem
            key={model.id}
            model={model}
            onToggleActive={onToggleActive}
            onUpdateModel={onUpdateModel}
            isUpdating={updatingIds.has(model.id)}
          />
        ))}
      </CardContent>
    </Card>
  )
}
