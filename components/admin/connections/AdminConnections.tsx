"use client"

import { Session } from "next-auth"
import { AdminSidebar } from "../AdminSidebar"

// Connections Panel Content (from connections.tsx)
import { useConnections } from "@/hooks/connections/useConnections"
import type { Connection, ConnectionsConfig, CreateConnectionData } from "@/types/connections"
import { OpenAIConnectionForm } from "./openai-connection-form"
import { OllamaConnectionForm } from "./ollama-connection-form"
import { EditConnectionDialog } from "./edit-connection-dialog"
import { MESSAGES } from "@/constants/connections"
// Server actions are handled inside the hook; do not import here

// Main Admin Connections Component
interface AdminConnectionsProps {
    session: Session | null
    initialChats?: any[]
    initialConnections?: Connection[]
    initialConnectionsConfig?: ConnectionsConfig | null
}

export function AdminConnections({ session, initialChats = [], initialConnections = [], initialConnectionsConfig = null }: AdminConnectionsProps) {
  const {
    connections,
    isSaving,
    testingConnections,
    successfulConnections,
    newConnections,
    newOllamaConnections,
    visibleApiKeys,
    visibleNewApiKeys,
    editingConnection,
    editForm,
    isUpdating,
    showEditApiKey,
    addNewConnectionRow,
    removeNewConnectionRow,
    updateNewConnection,
    updateNewOllamaConnection,
    handleClearAll,
    toggleApiKeyVisibility,
    toggleNewApiKeyVisibility,
    handleEditConnection,
    connectionsConfig,
    toggleOpenAIConnectionEnabledAt,
    toggleOllamaEnabled,
    testConnection,
    setEditState,
    setConnectionsState,
    loadConnections,
    saveConnections,
    updateConnection,
    deleteConnection
  } = useConnections(initialConnections, initialConnectionsConfig)

  const handleUpdateEditForm = (field: 'baseUrl' | 'apiKey', value: string) => {
    setEditState(prev => ({
      ...prev,
      editForm: { ...prev.editForm, [field]: value }
    }))
  }

  const handleToggleEditApiKey = () => {
    setEditState(prev => ({
      ...prev,
      showEditApiKey: !prev.showEditApiKey
    }))
  }

  const openaiConnections = connections.filter((conn): conn is Connection & { type: 'openai-api' } => conn.type === 'openai-api')
  const ollamaConnections = connections.filter((conn): conn is Connection & { type: 'ollama' } => conn.type === 'ollama')
  const openaiEnableStatuses = openaiConnections.map((_, idx) => {
    const cfgFromProviders = (connectionsConfig as any)?.providers?.openai?.settings?.api_configs?.[String(idx)]
    const cfgFromLegacy = (connectionsConfig as any)?.openai?.api_configs?.[String(idx)]
    const cfg = cfgFromProviders ?? cfgFromLegacy
    return !!(cfg && cfg.enable)
  })
  const ollamaEnabled = Boolean(
    (connectionsConfig as any)?.providers?.ollama?.enabled ?? (connectionsConfig as any)?.ollama?.enable
  )

  // Server Action-backed handlers
  const handleSaveOpenAIConnections = async (connectionsToCreate: CreateConnectionData[]) => {
    await saveConnections(connectionsToCreate)
  }

  

  const handleUpdateConnectionAction = async () => {
    await updateConnection()
  }

  const handleDeleteConnectionAction = async () => {
    await deleteConnection()
  }

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{MESSAGES.CONNECTIONS_TITLE}</h2>
        </div>
        <p className="text-muted-foreground">{MESSAGES.CONNECTIONS_DESCRIPTION}</p>

         <div>
            {/* OpenAI Connection Form (includes existing connections) */}
            <OpenAIConnectionForm
              existingConnections={openaiConnections}
              newConnections={newConnections}
              visibleApiKeys={visibleApiKeys}
              visibleNewApiKeys={visibleNewApiKeys}
              isSaving={isSaving}
              onAddRow={addNewConnectionRow}
              onRemoveRow={removeNewConnectionRow}
              onUpdateConnection={updateNewConnection}
              onToggleApiKeyVisibility={toggleApiKeyVisibility}
              onToggleNewApiKeyVisibility={toggleNewApiKeyVisibility}
              onSave={handleSaveOpenAIConnections}
              onClearAll={handleClearAll}
              onEditConnection={handleEditConnection}
              enableStatuses={openaiEnableStatuses}
              onToggleEnable={(index, enabled) => toggleOpenAIConnectionEnabledAt(index, enabled)}
            />

            {/* Ollama Connection Form */}
            <OllamaConnectionForm
              newOllamaConnections={newOllamaConnections}
              existingOllamaConnections={ollamaConnections}
              testingConnections={testingConnections}
              successfulConnections={successfulConnections}
              onUpdateConnection={updateNewOllamaConnection}
              onTestConnection={testConnection}
              onEditConnection={handleEditConnection}
              ollamaEnabled={ollamaEnabled}
              onToggleOllamaEnabled={toggleOllamaEnabled}
            />
          </div>

        {/* Edit Connection Dialog */}
        <EditConnectionDialog
          editingConnection={editingConnection}
          editForm={editForm}
          isUpdating={isUpdating}
          showEditApiKey={showEditApiKey}
          onClose={() => setEditState(prev => ({ ...prev, editingConnection: null }))}
          onUpdateForm={handleUpdateEditForm}
          onToggleApiKeyVisibility={handleToggleEditApiKey}
          onUpdateConnection={handleUpdateConnectionAction}
          onDeleteConnection={handleDeleteConnectionAction}
        />
      </div>
    
  )
}
