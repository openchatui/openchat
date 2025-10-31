import { auth } from "@/lib/auth";
import { ApiKeyService } from './api-key.service';
import type { AuthenticationResult } from './api-auth.types';

// API Authentication Service
export class ApiAuthService {
  // Extract API key from request headers
  static extractApiKeyFromHeaders(headers: Headers): string | null {
    const authHeader = headers.get('authorization') || headers.get('Authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      return authHeader.slice(7).trim();
    }
    
    const apiKeyHeader = headers.get('x-api-key') || headers.get('X-API-Key');
    if (apiKeyHeader) {
      return apiKeyHeader.trim();
    }
    
    return null;
  }

  // Authenticate request using session or API key
  static async authenticateRequest(headers: Headers): Promise<AuthenticationResult> {
    // Try session authentication first
    const session = await auth();
    if (session?.user?.id) {
      return { userId: session.user.id, via: 'session' };
    }

    // Try API key authentication
    const apiKey = this.extractApiKeyFromHeaders(headers);
    if (apiKey) {
      const validation = await ApiKeyService.validateApiKey(apiKey);
      if (validation.isValid && validation.userId) {
        return { userId: validation.userId, via: 'apiKey' };
      }
    }

    return { userId: null, via: 'none' };
  }

  // Require authentication for API endpoints
  static async requireAuth(headers: Headers): Promise<string> {
    const auth = await this.authenticateRequest(headers);
    if (!auth.userId) {
      throw new Error('Authentication required');
    }
    return auth.userId;
  }

  // Check if request is authenticated
  static async isAuthenticated(headers: Headers): Promise<boolean> {
    const auth = await this.authenticateRequest(headers);
    return auth.userId !== null;
  }
}
