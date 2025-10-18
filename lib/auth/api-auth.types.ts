export interface ApiKeyListItem {
  id: string
  keyName: string
  createdAt: string
  updatedAt: string
}

export interface CreatedApiKey {
  id: string
  keyName: string
  createdAt: string
  key: string
}

export interface AuthenticationResult {
  userId: string | null;
  error?: string;
  via: 'session' | 'apiKey' | 'none';
}

export interface ApiKeyValidation {
  isValid: boolean;
  error?: string;
  userId?: string;
  keyId?: string;
}

export interface ApiKeyCreation {
  id: string;
  keyName: string;
  key: string;
  createdAt: string;
}

export interface ApiKeyInfo {
  id: string;
  keyName: string;
  createdAt: string;
  updatedAt: string;
}
