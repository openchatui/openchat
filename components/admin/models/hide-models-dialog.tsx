"use client"

import { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import type { Model } from "@/types/models"

interface HideModelsDialogProps {
  owner: string
  models: Model[]
  onUpdateModels: (modelUpdates: { id: string; hidden: boolean }[]) => Promise<void>
}

export function HideModelsDialog({ owner, models, onUpdateModels }: HideModelsDialogProps) {
  const [open, setOpen] = useState(false)
  const [hiddenStates, setHiddenStates] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Initialize hidden states when dialog opens
  useEffect(() => {
    if (open) {
      const initialStates: Record<string, boolean> = {}
      models.forEach(model => {
        initialStates[model.id] = model.meta?.hidden || false
      })
      setHiddenStates(initialStates)
    }
  }, [open, models])

  const handleModelToggle = (modelId: string, checked: boolean) => {
    setHiddenStates(prev => ({
      ...prev,
      [modelId]: checked
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updates = models
        .filter(model => (model.meta?.hidden || false) !== hiddenStates[model.id])
        .map(model => ({
          id: model.id,
          hidden: hiddenStates[model.id]
        }))

      if (updates.length > 0) {
        await onUpdateModels(updates)
      }
      setOpen(false)
    } catch (error) {
      console.error('Failed to update model visibility:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const hiddenCount = Object.values(hiddenStates).filter(Boolean).length
  const visibleCount = models.length - hiddenCount

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title={`Hide/show models for ${owner}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Manage Visibility - {owner}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total models: {models.length}</span>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-green-600">
                <Eye className="h-3 w-3 mr-1" />
                Visible: {visibleCount}
              </Badge>
              <Badge variant="secondary" className="text-gray-600">
                <EyeOff className="h-3 w-3 mr-1" />
                Hidden: {hiddenCount}
              </Badge>
            </div>
          </div>

          <Separator />

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {models.map((model) => (
                <div key={model.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`model-${model.id}`}
                    checked={hiddenStates[model.id] || false}
                    onCheckedChange={(checked) => handleModelToggle(model.id, checked as boolean)}
                  />
                  <Label
                    htmlFor={`model-${model.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    <div className="flex flex-col">
                      <span className={`font-medium ${model.meta?.hidden ? 'text-muted-foreground' : ''}`}>
                        {model.name}
                      </span>
                      {model.meta?.description && (
                        <span className="text-xs text-muted-foreground truncate">
                          {model.meta.description}
                        </span>
                      )}
                    </div>
                  </Label>
                  <div className="flex gap-1">
                    {model.meta?.hidden && (
                      <Badge variant="secondary" className="text-xs">
                        Hidden
                      </Badge>
                    )}
                    {!model.isActive && (
                      <Badge variant="outline" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
