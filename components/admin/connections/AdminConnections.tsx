"use client"

import { Session } from "next-auth"
import { AdminSidebar } from "../AdminSidebar"
import { useRouter } from "next/navigation"

// Connections Panel Content (from connections.tsx)
import { Loader2 } from "lucide-react"
import { useConnections } from "@/hooks/useConnections"
import type { Connection, ConnectionsConfig, CreateConnectionData } from "@/types/connections"
import { OpenAIConnectionForm } from "./openai-connection-form"
import { OllamaConnectionForm } from "./ollama-connection-form"
import { EditConnectionDialog } from "./edit-connection-dialog"
import { MESSAGES } from "@/constants/connections"
import { createConnections, 
  updateConnectionAction, 
  deleteConnectionAction, 
  updateConnectionsConfig, 
  syncModelsAction } from "@/actions/connections"

// Main Admin Connections Component
interface AdminConnectionsProps {
    session: Session | null
    initialChats?: any[]
    initialConnections?: Connection[]
    initialConnectionsConfig?: ConnectionsConfig | null
}

export function AdminConnections({ session, initialChats = [], initialConnections = [], initialConnectionsConfig = null }: AdminConnectionsProps) {
  const router = useRouter()
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
    addNewConnectionRow,
    removeNewConnectionRow,
    updateNewConnection,
    updateNewOllamaConnection,
    handleClearAll,
    toggleApiKeyVisibility,
    toggleNewApiKeyVisibility,
    handleEditConnection,
    connectionsConfig,
    testConnection,
    setEditState,
    setConnectionsState
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

  const openaiConnections = connections.filter(conn => conn.type === 'openai-api')
  const ollamaConnections = connections.filter(conn => conn.type === 'ollama')
  const openaiEnableStatuses = openaiConnections.map((_, idx) => {
    const cfg = connectionsConfig?.openai?.api_configs?.[String(idx)] as any
    return !!cfg?.enable
  })
  const ollamaEnabled = !!connectionsConfig?.ollama?.enable

  // Server Action-backed handlers
  const handleSaveOpenAIConnections = async (connectionsToCreate: CreateConnectionData[]) => {
    try {
      setConnectionsState(prev => ({ ...prev, isSaving: true }))
      await createConnections(connectionsToCreate)
      // Sync models for created connections
      for (const conn of connectionsToCreate) {
        await syncModelsAction({ baseUrl: conn.baseUrl, type: 'openai-api', apiKey: conn.apiKey })
      }
      // Reset local form rows
      handleClearAll()
    } finally {
      setConnectionsState(prev => ({ ...prev, isSaving: false }))
      router.refresh()
    }
  }

  const handleToggleOpenAIConnectionEnabledAt = async (index: number, enabled: boolean) => {
    await updateConnectionsConfig({ connections: { openai: { api_configs: { [String(index)]: { enable: enabled } } } } })
    router.refresh()
  }

  const handleToggleOllamaEnabledAction = async (enabled: boolean) => {
    await updateConnectionsConfig({ connections: { ollama: { enable: enabled } } })
    router.refresh()
  }

  const handleUpdateConnectionAction = async () => {
    if (!editingConnection) return
    try {
      setEditState(prev => ({ ...prev, isUpdating: true }))
      await updateConnectionAction(editingConnection.id, {
        type: editingConnection.type,
        baseUrl: editForm.baseUrl,
        apiKey: editingConnection.type === 'openai-api' ? editForm.apiKey : undefined
      })
      await syncModelsAction({
        baseUrl: editForm.baseUrl,
        type: editingConnection.type as 'openai-api' | 'ollama',
        apiKey: editingConnection.type === 'openai-api' ? editForm.apiKey : undefined
      })
      setEditState(prev => ({ ...prev, editingConnection: null }))
    } finally {
      setEditState(prev => ({ ...prev, isUpdating: false }))
      router.refresh()
    }
  }

  const handleDeleteConnectionAction = async () => {
    if (!editingConnection) return
    try {
      setEditState(prev => ({ ...prev, isUpdating: true }))
      await deleteConnectionAction(editingConnection.id)
      setEditState(prev => ({ ...prev, editingConnection: null }))
    } finally {
      setEditState(prev => ({ ...prev, isUpdating: false }))
      router.refresh()
    }
  }

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
              onSave={handleSaveOpenAIConnections}
              onClearAll={handleClearAll}
              onEditConnection={handleEditConnection}
              enableStatuses={openaiEnableStatuses}
              onToggleEnable={(index, enabled) => handleToggleOpenAIConnectionEnabledAt(index, enabled)}
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
              onToggleOllamaEnabled={handleToggleOllamaEnabledAction}
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
          onUpdateConnection={handleUpdateConnectionAction}
          onDeleteConnection={handleDeleteConnectionAction}
        />
      </div>
    </AdminSidebar>
  )
}
