export type ConnectionType = 'openai-api' | 'ollama'

export interface Connection {
  id: string
  type: ConnectionType
  baseUrl: string
  apiKey?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateConnectionData {
  type: ConnectionType
  baseUrl: string
  apiKey?: string
}

export interface UpdateConnectionData extends Partial<CreateConnectionData> {}

export interface NewConnection {
  id: string
  baseUrl: string
  apiKey: string
}

export interface NewOllamaConnection {
  id: string
  baseUrl: string
}

export interface ConnectionTestResult {
  success: boolean
  status?: number
  error?: string
}

export interface ModelSyncResult {
  count: number
  models?: any[]
}

export interface EditForm {
  baseUrl: string
  apiKey: string
}

export interface ConnectionsState {
  connections: Connection[]
  isLoading: boolean
  isSaving: boolean
  testingConnections: Set<string>
  successfulConnections: Set<string>
  deletingIds: Set<string>
}

export interface ConnectionFormState {
  newConnections: NewConnection[]
  newOllamaConnections: NewOllamaConnection[]
  visibleApiKeys: Set<string>
  visibleNewApiKeys: Set<string>
}

export interface EditState {
  editingConnection: Connection | null
  editForm: EditForm
  isUpdating: boolean
  showEditApiKey: boolean
}
