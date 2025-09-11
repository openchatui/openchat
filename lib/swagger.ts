import { createSwaggerSpec } from 'next-swagger-doc'

export async function getApiDocs() {
  const spec = createSwaggerSpec({
    apiFolder: 'app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'OpenChat API',
        version: '1.0.0',
        description: 'API documentation for OpenChat',
      },
      tags: [
        { name: 'Admin', description: 'Admin management endpoints' },
        { name: 'Connections', description: 'Provider connections management' },
        { name: 'Models', description: 'Model management and sync' },
        { name: 'API Keys', description: 'User API key management' },
        { name: 'Chats', description: 'Chat creation and messaging' },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [],
    },
  })
  return spec
}