"use client"

import { Session } from "next-auth"
import { AdminSidebar } from "../AdminSidebar"

// Connections Panel Content (from connections.tsx)
import { Loader2 } from "lucide-react"
import { useConnections } from "@/hooks/useConnections"
import { OpenAIConnectionForm } from "./openai-connection-form"
import { OllamaConnectionForm } from "./ollama-connection-form"
import { EditConnectionDialog } from "./edit-connection-dialog"
import { MESSAGES } from "@/constants/connections"

// Main Admin Connections Component
interface AdminConnectionsProps {
    session: Session | null
    initialChats?: any[]
}

export function AdminConnections({ session, initialChats = [] }: AdminConnectionsProps) {
  const {
    connections,
    isLoading,
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
    saveConnections,
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
    updateConnection,
    deleteConnection,
    testConnection,
    setEditState
  } = useConnections()

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

  const openaiConnections = connections.filter(conn => conn.type === 'openai-api')
  const ollamaConnections = connections.filter(conn => conn.type === 'ollama')
  const openaiEnableStatuses = openaiConnections.map((_, idx) => {
    const cfg = connectionsConfig?.openai?.api_configs?.[String(idx)] as any
    return !!cfg?.enable
  })
  const ollamaEnabled = !!connectionsConfig?.ollama?.enable

  return (
    <AdminSidebar session={session} activeTab="connections" initialChats={initialChats}>
      <div className="max-w-none mx-auto space-y-6">
        <div className="mx-2.5">
          <h2 className="text-2xl font-semibold">{MESSAGES.CONNECTIONS_TITLE}</h2>
          <p className="text-muted-foreground">
            {MESSAGES.CONNECTIONS_DESCRIPTION}
          </p>
        </div>

         {isLoading ? (
           <div className="mx-2.5 flex flex-col items-center justify-center py-12">
             <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-muted-foreground">{MESSAGES.LOADING_CONNECTIONS}</p>
           </div>
         ) : (
           <div className="mx-2.5">
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
              onSave={saveConnections}
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
                )}

        {/* Edit Connection Dialog */}
        <EditConnectionDialog
          editingConnection={editingConnection}
          editForm={editForm}
          isUpdating={isUpdating}
          showEditApiKey={showEditApiKey}
          onClose={() => setEditState(prev => ({ ...prev, editingConnection: null }))}
          onUpdateForm={handleUpdateEditForm}
          onToggleApiKeyVisibility={handleToggleEditApiKey}
          onUpdateConnection={updateConnection}
          onDeleteConnection={deleteConnection}
        />
      </div>
    </AdminSidebar>
  )
}
