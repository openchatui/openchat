// =============================================================================
// OpenChat Library v2 - Main Index
// =============================================================================

// Core DB
export { default as db } from './db/client.db'

// Core security and config
export * from './auth/authz'
export {
  ConfigService,
  getWebSearchEnabled,
  getImageGenerationAvailable,
  getAudioConfig,
} from './modules/config/config.service'


