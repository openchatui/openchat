"use client"

import { Loader2, Trash2, Save, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MESSAGES, PLACEHOLDERS } from "@/constants/connections"
import type { Connection, EditForm } from "@/types/connections"

interface EditConnectionDialogProps {
  editingConnection: Connection | null
  editForm: EditForm
  isUpdating: boolean
  showEditApiKey: boolean
  onClose: () => void
  onUpdateForm: (field: keyof EditForm, value: string) => void
  onToggleApiKeyVisibility: () => void
  onUpdateConnection: () => void
  onDeleteConnection: () => void
}

export function EditConnectionDialog({
  editingConnection,
  editForm,
  isUpdating,
  showEditApiKey,
  onClose,
  onUpdateForm,
  onToggleApiKeyVisibility,
  onUpdateConnection,
  onDeleteConnection
}: EditConnectionDialogProps) {
  if (!editingConnection) return null

  const isOpenAI = editingConnection.type === 'openai-api'
  const title = `Edit ${isOpenAI ? 'OpenAI' : 'Ollama'} Connection`

  return (
    <Dialog open={!!editingConnection} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{MESSAGES.BASE_URL_LABEL}</label>
            <Input
              value={editForm.baseUrl}
              onChange={(e) => onUpdateForm('baseUrl', e.target.value)}
              placeholder={isOpenAI ? PLACEHOLDERS.OPENAI_BASE_URL : PLACEHOLDERS.OLLAMA_BASE_URL}
              onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
            />
          </div>

          {isOpenAI && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{MESSAGES.API_KEY_LABEL}</label>
              <div className="relative">
                <Input
                  type={showEditApiKey ? "text" : "password"}
                  value={editForm.apiKey}
                  onChange={(e) => onUpdateForm('apiKey', e.target.value)}
                  placeholder={PLACEHOLDERS.API_KEY}
                  className="pr-10"
                  onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={onToggleApiKeyVisibility}
                >
                  {showEditApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="destructive"
              onClick={onDeleteConnection}
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {MESSAGES.DELETE}
            </Button>

            <Button
              onClick={onUpdateConnection}
              disabled={isUpdating || !editForm.baseUrl.trim() ||
                (isOpenAI && !editForm.apiKey.trim())}
              className="flex items-center gap-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isUpdating ? MESSAGES.SAVING : MESSAGES.SAVE}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
