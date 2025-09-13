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

export interface OpenAIConfigEntry {
  enable?: boolean
  tags?: string[]
  prefix_id?: string
  model_ids?: string[]
  connection_type?: string
  [key: string]: unknown
}

export interface ConnectionsConfig {
  openai: {
    enable: boolean
    api_base_urls: string[]
    api_keys: string[]
    api_configs: Record<string, OpenAIConfigEntry>
  }
  ollama: {
    enable: boolean
    base_urls: string[]
    api_configs: Record<string, unknown>
  }
}
