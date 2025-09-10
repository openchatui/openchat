"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Edit } from "lucide-react"
import type { Model } from "@/types/models"

interface ModelItemProps {
  model: Model
  onToggleActive: (modelId: string, isActive: boolean) => void
  isUpdating: boolean
}

export function ModelItem({ model, onToggleActive, isUpdating }: ModelItemProps) {
  const profileImageUrl = model.meta?.profile_image_url || "/OpenChat.png"

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={profileImageUrl} alt={model.name} />
          <AvatarFallback>
            {model.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col">
          <span className="font-medium text-sm">{model.name}</span>
          <span className="text-xs text-muted-foreground">{model.id}</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>

        <Switch
          checked={model.isActive}
          onCheckedChange={(checked) => onToggleActive(model.id, checked)}
          disabled={isUpdating}
        />
      </div>
    </div>
  )
}
