// Deprecated: legacy generator (kept temporarily for compatibility)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// ts-expect-error legacy export remains for now
export const getApiDocs = async () => {
  throw new Error('Legacy swagger generator removed. Use /api/docs and /docs instead.')
}

// OpenAPI specification type
export type OpenAPISpec = Record<string, unknown>;

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
export {}

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


