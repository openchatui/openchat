import type { NewConnection, NewOllamaConnection } from '@/types/connections'

export const DEFAULT_OPENAI_CONNECTION: NewConnection = {
  id: "1",
  baseUrl: "",
  apiKey: ""
}

export const DEFAULT_OLLAMA_CONNECTION: NewOllamaConnection = {
  id: "1",
  baseUrl: ""
}

export const PLACEHOLDERS = {
  OPENAI_BASE_URL: "https://api.openai.com/v1",
  OLLAMA_BASE_URL: "http://localhost:11434",
  API_KEY: "Api Key"
} as const

export const API_ENDPOINTS = {
  CONNECTIONS_TEST: '/api/connections/test',
  MODELS_SYNC: '/api/v1/models/sync'
} as const

export const MESSAGES = {
  LOADING_CONNECTIONS: 'Loading connections...',
  SAVE_OPENAI_CONNECTIONS: 'Save',
  CLEAR_ALL: 'Clear All',
  TEST_CONNECTION: 'Test Connection',
  SAVE: 'Save',
  SAVING: 'Saving...',
  DELETE: 'Delete',
  EDIT: 'Edit',
  CONNECTIONS_TITLE: 'Connections',
  CONNECTIONS_DESCRIPTION: 'Manage your OpenAI & Ollama connections and endpoints',
  OPENAI_CONNECTIONS_TITLE: 'OpenAI API Connections',
  OLLAMA_CONNECTION_TITLE: 'Ollama Connection',
  BASE_URL_LABEL: 'Base URL',
  API_KEY_LABEL: 'API Key',
  ACTIONS_LABEL: 'Actions'
} as const

export const TOAST_MESSAGES = {
  CONNECTIONS_LOADED: 'Connections loaded successfully',
  CONNECTION_SAVED: 'Connection saved',
  CONNECTION_UPDATED: 'Connection updated',
  CONNECTION_DELETED: 'Connection deleted successfully',
  CONNECTION_TEST_SUCCESSFUL: 'Connection test successful',
  CONNECTION_TEST_SUCCESSFUL_SYNC: 'Connected',
  CONNECTION_TEST_FAILED: 'Connection test failed',
  SAVE_FAILED: 'Failed to save connections',
  UPDATE_FAILED: 'Failed to update connection',
  DELETE_FAILED: 'Failed to delete connection',
  FILL_COMPLETE_CONNECTION: 'Please fill in at least one complete connection',
  ENTER_BASE_URL: 'Please enter a Base URL first',
  CONNECTION_TEST_PASSED_SAVE_FAILED: 'Connection test passed but failed to save'
} as const
