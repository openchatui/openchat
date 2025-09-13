import { Loader2, Check, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { MESSAGES, PLACEHOLDERS } from "@/constants/connections"
import type { NewOllamaConnection, Connection } from "@/types/connections"

interface OllamaConnectionFormProps {
  newOllamaConnections: NewOllamaConnection[]
  existingOllamaConnections: Connection[]
  testingConnections: Set<string>
  successfulConnections: Set<string>
  onUpdateConnection: (id: string, field: 'baseUrl', value: string) => void
  onTestConnection: (connectionId: string, baseUrl: string) => void
  onEditConnection?: (connection: Connection) => void
  ollamaEnabled?: boolean
  onToggleOllamaEnabled?: (enabled: boolean) => void
}

export function OllamaConnectionForm({
  newOllamaConnections,
  existingOllamaConnections,
  testingConnections,
  successfulConnections,
  onUpdateConnection,
  onTestConnection,
  onEditConnection,
  ollamaEnabled = false,
  onToggleOllamaEnabled
}: OllamaConnectionFormProps) {
  const hasExistingOllamaConnection = existingOllamaConnections.length > 0

  return (
    <div className="mt-8">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{MESSAGES.OLLAMA_CONNECTION_TITLE}</h3>
          <div className="flex items-center">
            <Switch
              checked={ollamaEnabled}
              onCheckedChange={(checked) => onToggleOllamaEnabled?.(Boolean(checked))}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {/* Existing saved Ollama connections */}
        {existingOllamaConnections.map((connection) => (
          <div key={connection.id} className="rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{MESSAGES.BASE_URL_LABEL}</label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {connection.baseUrl}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{MESSAGES.ACTIONS_LABEL}</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTestConnection(connection.id, connection.baseUrl)}
                    disabled={testingConnections.has(connection.id)}
                    className="flex items-center gap-2"
                  >
                    {testingConnections.has(connection.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : successfulConnections.has(connection.id) ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      MESSAGES.TEST_CONNECTION
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditConnection?.(connection)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* New Ollama connection input - only show if no saved Ollama connection exists */}
        {!hasExistingOllamaConnection && newOllamaConnections.length > 0 && newOllamaConnections.map((connection) => (
          <div key={connection.id} className="rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {MESSAGES.BASE_URL_LABEL}
                </label>
                <Input
                  placeholder={PLACEHOLDERS.OLLAMA_BASE_URL}
                  value={connection.baseUrl}
                  onChange={(e) =>
                    onUpdateConnection(connection.id, 'baseUrl', e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{MESSAGES.ACTIONS_LABEL}</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTestConnection(connection.id, connection.baseUrl)}
                    disabled={testingConnections.has(connection.id) || !connection.baseUrl.trim()}
                    className="flex items-center gap-2"
                  >
                    {testingConnections.has(connection.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : successfulConnections.has(connection.id) ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      MESSAGES.TEST_CONNECTION
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
