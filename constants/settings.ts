import { KeyRound, UserCog, Blocks } from "lucide-react"

export interface SettingsNavItem {
  id: string
  label: string
  href: string
  icon: any
}

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { id: 'profile', label: 'Profile', href: '/settings/profile', icon: UserCog },
  { id: 'keys', label: 'API Keys', href: '/settings/keys', icon: KeyRound },
  { id: 'integrations', label: 'Integrations', href: '/settings/integrations', icon: Blocks },
]

export const SETTINGS_MESSAGES = {
  TITLE: 'Settings',
  DESCRIPTION: 'Manage your profile and API access',
  KEYS_TITLE: 'API Keys',
  KEYS_DESCRIPTION: 'Create and manage API keys to access the API.',
  INTEGRATIONS_TITLE: 'Integrations',
  INTEGRATIONS_DESCRIPTION: 'Connect third-party services like Google Drive.',
  CREATE_KEY: 'Create API Key',
  KEY_NAME_LABEL: 'Key name',
  DELETE: 'Delete',
  CONFIRM_DELETE: 'Are you sure you want to delete this key?',
  LOADING_KEYS: 'Loading keys...',
  NO_KEYS: 'No API keys yet. Create one to get started.',
} as const

export const TOAST = {
  KEY_CREATED: 'API key created. Copy it now; it will not be shown again.',
  KEY_DELETED: 'API key deleted.',
  ERROR_GENERIC: 'Something went wrong.',
}


