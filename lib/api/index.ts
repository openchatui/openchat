// Authentication
export {
  ApiAuthService,
} from './auth/api-auth.service';

export {
  ApiKeyService,
} from './auth/api-key.service';

export type {
  AuthenticationResult,
  ApiKeyValidation,
  ApiKeyCreation,
  ApiKeyInfo,
} from './auth/api-auth.types';

// Validation
export {
  ValidationService,
} from './validation/validation.service';

// Streaming
export {
  SSEService,
} from './streaming/sse.service';

// Documentation
export {
  SwaggerService,
} from './documentation/swagger.service';

// Legacy compatibility - create wrapper functions
export const authenticateRequest = async (headers: Headers) => {
  const { ApiAuthService } = await import('./auth/api-auth.service');
  return ApiAuthService.authenticateRequest(headers);
};

export const extractApiKeyFromHeaders = (headers: Headers) => {
  const { ApiAuthService } = require('./auth/api-auth.service');
  return ApiAuthService.extractApiKeyFromHeaders(headers);
};

export const withSSEHeaders = (response: Response) => {
  const { SSEService } = require('./streaming/sse.service');
  return SSEService.withSSEHeaders(response);
};

export const getApiDocs = async () => {
  const { SwaggerService } = await import('./documentation/swagger.service');
  return SwaggerService.getApiDocs();
};
