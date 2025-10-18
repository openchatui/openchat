"use client"

import { Plus, Eye, EyeOff, X, Save, Loader2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiKeyField } from "@/components/admin/ApiKeyField"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { PLACEHOLDERS, MESSAGES, TOAST_MESSAGES } from "@/constants/connections"
import type { NewConnection, CreateConnectionData, Connection } from "@/lib/modules/connections/connections.types"

interface OpenAIConnectionFormProps {
  existingConnections: (Connection & { type: 'openai-api' })[]
  newConnections: NewConnection[]
  visibleApiKeys: Set<string>
  visibleNewApiKeys: Set<string>
  isSaving: boolean
  onAddRow: () => void
  onRemoveRow: (id: string) => void
  onUpdateConnection: (id: string, field: 'baseUrl' | 'apiKey', value: string) => void
  onToggleApiKeyVisibility: (id: string) => void
  onToggleNewApiKeyVisibility: (id: string) => void
  onSave: (connections: CreateConnectionData[]) => Promise<void>
  onClearAll: () => void
  onEditConnection: (connection: Connection & { type: 'openai-api' }) => void
  enableStatuses?: boolean[]
  onToggleEnable?: (index: number, enabled: boolean) => void
}

export function OpenAIConnectionForm({
  existingConnections,
  newConnections,
  visibleApiKeys,
  visibleNewApiKeys,
  isSaving,
  onAddRow,
  onRemoveRow,
  onUpdateConnection,
  onToggleApiKeyVisibility,
  onToggleNewApiKeyVisibility,
  onSave,
  onClearAll,
  onEditConnection,
  enableStatuses = [],
  onToggleEnable
}: OpenAIConnectionFormProps) {
  const hasValidConnections = newConnections.some(conn => conn.baseUrl.trim() && conn.apiKey.trim())

  const handleSave = async () => {
    const validConnections = newConnections.filter(conn =>
      conn.baseUrl.trim() && conn.apiKey.trim()
    )

    if (validConnections.length === 0) {
      toast.error(TOAST_MESSAGES.FILL_COMPLETE_CONNECTION)
      return
    }

    const connectionsToCreate: CreateConnectionData[] = validConnections.map(conn => ({
      type: 'openai-api',
      baseUrl: conn.baseUrl.trim(),
      apiKey: conn.apiKey.trim()
    }))

    await onSave(connectionsToCreate)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{MESSAGES.OPENAI_CONNECTIONS_TITLE}</h3>
        <Button
          onClick={onAddRow}
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Existing saved OpenAI connections */}
      {existingConnections.map((connection, idx) => (
        <div key={connection.id} className="rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{MESSAGES.BASE_URL_LABEL}</Label>
              <div className="h-10 px-3 bg-muted rounded-md text-sm flex items-center">
                {connection.baseUrl}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="opacity-0 select-none">{MESSAGES.API_KEY_LABEL}</Label>
              <div className="flex gap-2 items-center w-full">
                <div className="flex-1">
                  <ApiKeyField
                    label={MESSAGES.API_KEY_LABEL}
                    value={connection.apiKey || ""}
                    onChange={() => {}}
                    onSave={async () => {}}
                    autosave={false}
                    showSavedIndicator={false}
                    hideLabel
                    placeholder={PLACEHOLDERS.API_KEY}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditConnection(connection)}
                  className="flex items-center gap-2 h-10"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <div className="flex items-center pl-1 h-10">
                  <Switch
                    checked={!!enableStatuses[idx]}
                    onCheckedChange={(checked) => onToggleEnable?.(idx, Boolean(checked))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* New connection inputs */}
      {newConnections.map((connection) => (
        <div key={connection.id} className="rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {MESSAGES.BASE_URL_LABEL}
              </Label>
              <Input
                placeholder={PLACEHOLDERS.OPENAI_BASE_URL}
                value={connection.baseUrl}
                onChange={(e) =>
                  onUpdateConnection(connection.id, 'baseUrl', e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{MESSAGES.API_KEY_LABEL}</Label>
                {newConnections.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveRow(connection.id)}
                    className="h-2 w-2 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <ApiKeyField
                label={MESSAGES.API_KEY_LABEL}
                value={connection.apiKey}
                onChange={(v) => onUpdateConnection(connection.id, 'apiKey', v)}
                onSave={async () => { /* no-op: saved via Save button */ }}
                autosave={false}
                showSavedIndicator={false}
                hideLabel
                placeholder={PLACEHOLDERS.API_KEY}
              />
            </div>
          </div>
        </div>
      ))}

      {hasValidConnections && (
        <div className="flex gap-2 mt-6">
          <Button
            onClick={handleSave}
            className="flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? MESSAGES.SAVING : MESSAGES.SAVE_OPENAI_CONNECTIONS}
          </Button>
          <Button
            variant="outline"
            onClick={onClearAll}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            {MESSAGES.CLEAR_ALL}
          </Button>
        </div>
      )}
    </div>
  )
}
