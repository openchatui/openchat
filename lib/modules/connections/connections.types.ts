export type ConnectionType = 'openai-api' | 'ollama';

export interface Connection {
  id: string;
  type: ConnectionType;
  baseUrl: string;
  apiKey: string | null;
  provider?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConnectionData {
  type: ConnectionType;
  baseUrl: string;
  apiKey?: string;
  provider?: string;
}

export interface UpdateConnectionData {
  type?: ConnectionType;
  baseUrl?: string;
  apiKey?: string;
  provider?: string;
}

export interface EditForm {
  baseUrl: string;
  apiKey: string;
}

export interface ConnectionsState {
  connections: Connection[];
  isLoading: boolean;
  isSaving: boolean;
  testingConnections: Set<string>;
  successfulConnections: Set<string>;
  deletingIds: Set<string>;
}

export interface ConnectionFormState {
  newConnections: NewConnection[];
  newOllamaConnections: NewOllamaConnection[];
  visibleApiKeys: Set<string>;
  visibleNewApiKeys: Set<string>;
}

export interface EditState {
  editingConnection: Connection | null;
  editForm: EditForm;
  isUpdating: boolean;
  showEditApiKey: boolean;
}

export interface NewConnection {
  id: string;
  baseUrl: string;
  apiKey: string;
}

export interface NewOllamaConnection {
  id: string;
  baseUrl: string;
}

export interface ConnectionsConfig {
  providers: Record<string, {
    enabled: boolean;
    apiKey?: string;
    baseUrl?: string;
    settings?: Record<string, any>;
  }>;
  openai?: {
    enable: boolean;
    api_base_urls: string[];
    api_keys: string[];
    api_configs: Record<string, { enable: boolean }>;
  };
  ollama?: {
    enable: boolean;
    base_urls: string[];
    api_configs: Record<string, any>;
  };
}