import { Plus, Eye, EyeOff, X, Save, Loader2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { PLACEHOLDERS, MESSAGES, TOAST_MESSAGES } from "@/constants/connections"
import type { NewConnection, CreateConnectionData, Connection } from "@/types/connections"

interface OpenAIConnectionFormProps {
  existingConnections: Connection[]
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
  onEditConnection: (connection: Connection) => void
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
  onEditConnection
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
      {existingConnections.map((connection) => (
        <div key={connection.id} className="rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{MESSAGES.BASE_URL_LABEL}</label>
              <div className="p-2 bg-muted rounded-md text-sm">
                {connection.baseUrl}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{MESSAGES.API_KEY_LABEL}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="p-2 bg-muted rounded-md text-sm font-mono pr-10">
                    {visibleApiKeys.has(connection.id)
                      ? connection.apiKey
                      : '•'.repeat(Math.min(connection.apiKey?.length || 0, 32))
                    }
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => onToggleApiKeyVisibility(connection.id)}
                  >
                    {visibleApiKeys.has(connection.id) ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditConnection(connection)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                </Button>
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
              <label className="text-sm font-medium">
                {MESSAGES.BASE_URL_LABEL}
              </label>
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
                <label className="text-sm font-medium">
                  {MESSAGES.API_KEY_LABEL}
                </label>
                {newConnections.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveRow(connection.id)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="relative">
                <Input
                  type={visibleNewApiKeys.has(connection.id) ? "text" : "password"}
                  placeholder={PLACEHOLDERS.API_KEY}
                  value={connection.apiKey}
                  onChange={(e) =>
                    onUpdateConnection(connection.id, 'apiKey', e.target.value)
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => onToggleNewApiKeyVisibility(connection.id)}
                >
                  {visibleNewApiKeys.has(connection.id) ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
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
