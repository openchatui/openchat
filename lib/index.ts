// =============================================================================
// OpenChat Library - Main Index
// =============================================================================
// This file provides organized exports from the OpenChat library modules
// Structure: lib/{auth, api, features, server, ai, audio, db, utils}

// =============================================================================
// CORE INFRASTRUCTURE
// =============================================================================

// Database
export { default as db } from './db';

// Utilities  
export { cn } from './utils';

// =============================================================================
// AUTHENTICATION & AUTHORIZATION
// =============================================================================

export {
  AuthService,
  AuthActionsService,
  AuthValidationService,
  authOptions,
  handlers,
  signIn,
  signOut,
  auth,
  loginSchema,
  signUpSchema,
  // Legacy compatibility
  signUp,
  schema,
} from './auth';

export type {
  ExtendedUser,
  JWTCallbackParams,
  SessionCallbackParams,
  AuthSession,
  SignUpData,
  LoginData,
  AuthResult,
  PasswordValidation,
  UserCreation,
  LoginSchema,
  SignUpSchema,
} from './auth';

// =============================================================================
// API INFRASTRUCTURE
// =============================================================================

export {
  ApiAuthService,
  ApiKeyService,
  ValidationService,
  SSEService,
  SwaggerService,
  // Legacy compatibility
  authenticateRequest,
  extractApiKeyFromHeaders,
  withSSEHeaders,
  getApiDocs,
} from './api';

export type {
  AuthenticationResult,
  ApiKeyValidation,
  ApiKeyCreation,
  ApiKeyInfo,
} from './api';

// =============================================================================
// BUSINESS FEATURES
// =============================================================================

// Chat Feature
export {
  ChatStore,
  ModelResolutionService,
  ModelParametersService,
  ChatPreparationService,
  SystemPromptService,
  MessageUtils,
  GenerationUtils,
  ProviderUtils,
  StreamUtils,
  PersistenceUtils,
  ValidationUtils,
  IdUtils,
} from './features/chat';

export type {
  ChatData,
  SelectedModelInfo,
  ModelResolutionArgs,
  ResolvedModelInfo,
  AdvancedControls,
  GenerationRequest,
  RawParamsRecord,
  NormalizedModelParams,
  ModelParamsInput,
  ChatPreparationInput,
  PreparedChat,
  SystemPromptInput,
  MessageMetadata,
  AppUIMessage,
} from './features/chat';

// Tools Feature
export {
  ToolService,
  ToolConfigService,
  ToolBuilderService,
  ImageGenerationService,
  ImageProviderService,
  WebBrowsingService,
  WebSearchProviderService,
  buildTools, // Legacy compatibility
} from './features/tools';

export type {
  ToolDefinition,
  ToolConfig,
  ToolResult,
  ToolExecutionContext,
  ProviderConfig,
  ToolCategory,
  ToolProvider,
  ImageGenerationConfig,
  ImageGenerationResult,
  BrowserConfig,
  BrowserSettings,
  BrowserResult,
} from './features/tools';

// =============================================================================
// AI & PROVIDERS
// =============================================================================

export {
  ProviderService,
  // Legacy compatibility
  resolveAiProvider,
} from './features/ai';

export type {
  SupportedProvider,
  ProviderConnection,
  ProviderResolutionInput,
  ProviderResolutionResult,
  ModelRow,
} from './features/ai';

// =============================================================================
// SERVER UTILITIES
// =============================================================================

export {
  PermissionsService,
  ModelAccessService,
  ConfigService,
  UserService,
  GroupService,
  // Legacy compatibility
  getUserRole,
  getUserGroupIds,
  getEffectivePermissionsForUser,
  isFeatureEnabled,
  canReadModel,
  canWriteModel,
  canReadModelById,
  filterModelsReadableByUser,
  getWebSearchEnabled,
  getImageGenerationAvailable,
  getAudioConfig,
  getAdminGroups,
  getAdminUsers,
  getAdminUsersLight,
  getAdminUsersLightPage,
} from './server';

export type {
  AudioConfig,
} from './server';

// =============================================================================
// CONNECTIONS & INTEGRATIONS
// =============================================================================

export {
  ConnectionService,
  connectionsApi,
} from './features/connections';

export type {
  Connection,
  CreateConnectionData,
} from './features/connections';

// =============================================================================
// AUDIO & MEDIA
// =============================================================================

export {
  WhisperService,
} from './features/audio';

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

// Legacy imports are preserved in ./legacy/ folder
// Use these imports for backward compatibility during migration:
// import { ... } from '@/lib/legacy/...'
