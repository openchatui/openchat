import 'server-only';
import crypto from 'crypto';
import db from '@/lib/db';
import type { ApiKeyValidation, ApiKeyCreation, ApiKeyInfo } from './api-auth.types';

/**
 * API Key Management Service
 */
export class ApiKeyService {
  private static readonly API_KEY_PREFIX = 'sk-';
  private static readonly KEY_LENGTH = 32;

  /**
   * Generate a new API key
   */
  static generateApiKey(): string {
    const random = crypto.randomBytes(16).toString('hex');
    return `${this.API_KEY_PREFIX}${random}`;
  }

  /**
   * Hash an API key for storage
   */
  static hashApiKey(plainKey: string): string {
    return crypto.createHash('sha256').update(plainKey).digest('hex');
  }

  /**
   * Validate API key format
   */
  static isValidApiKeyFormat(key: string): boolean {
    return key.startsWith(this.API_KEY_PREFIX) && 
           key.length === this.API_KEY_PREFIX.length + this.KEY_LENGTH;
  }

  /**
   * Create a new API key for a user
   */
  static async createApiKey(userId: string, keyName: string): Promise<ApiKeyCreation> {
    const plainKey = this.generateApiKey();
    const hashedKey = this.hashApiKey(plainKey);

    const record = await db.apiKey.create({
      data: {
        userId,
        keyName,
        key: hashedKey,
      },
      select: {
        id: true,
        keyName: true,
        createdAt: true,
      },
    });

    return {
      id: record.id,
      keyName: record.keyName,
      key: plainKey, // Return the plain key only once
      createdAt: record.createdAt.toISOString(),
    };
  }

  /**
   * Validate an API key and return user ID
   */
  static async validateApiKey(plainKey: string): Promise<ApiKeyValidation> {
    try {
      // Check format first
      if (!this.isValidApiKeyFormat(plainKey)) {
        return { isValid: false, error: 'Invalid API key format' };
      }

      const hashedKey = this.hashApiKey(plainKey);
      const keyRecord = await db.apiKey.findFirst({
        where: { key: hashedKey },
        select: { userId: true, id: true },
      });

      if (!keyRecord) {
        return { isValid: false, error: 'API key not found' };
      }

      return {
        isValid: true,
        userId: keyRecord.userId,
        keyId: keyRecord.id,
      };
    } catch (error) {
      console.error('API key validation error:', error);
      return { isValid: false, error: 'Validation failed' };
    }
  }

  /**
   * Revoke an API key
   */
  static async revokeApiKey(userId: string, keyId: string): Promise<boolean> {
    try {
      const keyRecord = await db.apiKey.findFirst({
        where: { id: keyId, userId },
      });

      if (!keyRecord) {
        return false;
      }

      await db.apiKey.delete({
        where: { id: keyId },
      });

      return true;
    } catch (error) {
      console.error('API key revocation error:', error);
      return false;
    }
  }

  /**
   * List API keys for a user (without the actual key values)
   */
  static async listApiKeys(userId: string): Promise<ApiKeyInfo[]> {
    try {
      const keys = await db.apiKey.findMany({
        where: { userId },
        select: {
          id: true,
          keyName: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return keys.map(key => ({
        id: key.id,
        keyName: key.keyName,
        createdAt: key.createdAt.toISOString(),
        updatedAt: key.updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error('API key listing error:', error);
      return [];
    }
  }

  /**
   * Check if a user has any API keys
   */
  static async hasApiKeys(userId: string): Promise<boolean> {
    try {
      const count = await db.apiKey.count({
        where: { userId },
      });
      return count > 0;
    } catch (error) {
      console.error('API key count error:', error);
      return false;
    }
  }
}
