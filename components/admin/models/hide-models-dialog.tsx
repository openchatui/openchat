"use client"

import { useState, useEffect, useMemo } from "react"
import { Eye, EyeOff, Search } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import type { Model } from "@/lib/features/models/model.types"

interface HideModelsDialogProps {
  owner: string
  models: Model[]
  onUpdateModels: (modelUpdates: { id: string; hidden: boolean }[]) => Promise<void>
}

export function HideModelsDialog({ owner, models, onUpdateModels }: HideModelsDialogProps) {
  const [open, setOpen] = useState(false)
  const [hiddenStates, setHiddenStates] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

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

  const filteredModels = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return models
    return models.filter(m => {
      const name = String(m.name || "").toLowerCase()
      const id = String(m.id || "").toLowerCase()
      const desc = String((m.meta as any)?.description || "").toLowerCase()
      return name.includes(term) || id.includes(term) || desc.includes(term)
    })
  }, [models, searchTerm])

  const handleSelectAll = (value: boolean) => {
    setHiddenStates(prev => {
      const next = { ...prev }
      filteredModels.forEach(m => { next[m.id] = value })
      return next
    })
  }

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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="text-green-600">
              <Eye className="h-3 w-3 mr-1" />
              Visible: {visibleCount}
            </Badge>
            <Badge variant="secondary" className="text-gray-600">
              <EyeOff className="h-3 w-3 mr-1" />
              Hidden: {hiddenCount}
            </Badge>
          </div>

          <Separator />

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search models by name or id"
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAll(true)}
            >
              Select all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSelectAll(false)}
            >
              Clear all
            </Button>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {filteredModels.map((model) => (
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
