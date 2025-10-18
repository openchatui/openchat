// =============================================================================
// OpenChat Library v2 - Main Index
// =============================================================================

// Core DB
export { default as db } from './core/db/client'

// Core API utilities
export { ValidationService } from './core/api/validation'
export { SSEService } from './core/api/sse'
export { SwaggerService } from './core/api/swagger'

// Core security and config
export * from './core/security/authz'
export {
  ConfigService,
  getWebSearchEnabled,
  getImageGenerationAvailable,
  getAudioConfig,
} from './core/config/service'


