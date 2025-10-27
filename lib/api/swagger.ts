import { createSwaggerSpec } from 'next-swagger-doc';

// OpenAPI specification type
export type OpenAPISpec = ReturnType<typeof createSwaggerSpec>;

// API documentation format options
export type DocFormat = 'json' | 'yaml';

// API endpoints summary type
export interface EndpointsSummary {
  v1: {
    authentication: string[];
    apiKeys: string[];
    chats: string[];
    models: string[];
    tools: string[];
    admin: string[];
  };
}

// Get the OpenAPI specification for the API
export async function getApiDocs(): Promise<OpenAPISpec> {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'OpenChat API',
        version: '1.0.0',
        description: 'Comprehensive API documentation for OpenChat platform',
        contact: {
          name: 'OpenChat Support',
          url: 'https://github.com/openchat/openchat',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: '/api/v1',
          description: 'API v1',
        },
      ],
      tags: [
        { name: 'API Keys', description: 'API key management for programmatic access' },
        { name: 'Chats', description: 'Chat creation, messaging, and management' },
        { name: 'Models', description: 'AI model management and configuration' },
        { name: 'Tools', description: 'Tool integration and execution' },
        { name: 'Admin', description: 'Administrative functions and system management' },
        { name: 'Connections', description: 'Provider connections and configuration' },
        { name: 'Users', description: 'User management and profile operations' },
        { name: 'Drive', description: 'Drive features: files, folders, sync, downloads' },
        { name: 'Ollama', description: 'Local model management and operations via Ollama' },
        { name: 'Audio', description: 'Audio TTS/STT and configuration' },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Session-based authentication using JWT tokens',
          },
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key for programmatic access',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string', description: 'Error message' },
              timestamp: { type: 'string', format: 'date-time', description: 'When the error occurred' },
            },
            required: ['error', 'timestamp'],
          },
          ChatMessage: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique message identifier' },
              role: { type: 'string', enum: ['user', 'assistant', 'system'], description: 'Message role' },
              parts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['text', 'image'] },
                    text: { type: 'string' },
                  },
                },
              },
              metadata: { type: 'object', description: 'Message metadata' },
            },
            required: ['id', 'role', 'parts'],
          },
          Model: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique model identifier' },
              name: { type: 'string', description: 'Model name' },
              provider: { type: 'string', description: 'Model provider' },
              isActive: { type: 'boolean', description: 'Whether the model is active' },
              meta: { type: 'object', description: 'Model metadata' },
            },
            required: ['id', 'name'],
          },
        },
      },
      security: [
        { BearerAuth: [] },
        { ApiKeyAuth: [] },
      ],
    },
  });

  return spec;
}

// Generate API documentation in different formats
export async function generateDocs(format: DocFormat = 'json'): Promise<OpenAPISpec> {
  const spec = await getApiDocs();
  
  if (format === 'yaml') {
    // Convert to YAML if needed (would require a YAML library)
    throw new Error('YAML format not yet implemented');
  }
  
  return spec;
}

// Get API endpoints summary
export function getEndpointsSummary(): EndpointsSummary {
  return {
    v1: {
      authentication: [
        'POST /auth/login',
        'POST /auth/logout',
        'GET /auth/session',
      ],
      apiKeys: [
        'GET /api-keys',
        'POST /api-keys',
        'DELETE /api-keys/{id}',
      ],
      chats: [
        'GET /chats',
        'POST /chats',
        'GET /chats/{id}',
        'PUT /chats/{id}',
        'DELETE /chats/{id}',
        'POST /chat',
      ],
      models: [
        'GET /models',
        'POST /models',
        'GET /models/{id}',
        'PUT /models/{id}',
        'DELETE /models/{id}',
      ],
      tools: [
        'GET /tools',
        'POST /tools/execute',
        'GET /tools/{id}',
      ],
      admin: [
        'GET /admin/users',
        'GET /admin/models',
        'GET /admin/connections',
        'GET /admin/config',
      ],
    },
  };
}


