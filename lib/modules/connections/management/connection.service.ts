import 'server-only';
import db from '@/lib/db';

import type {
  Connection,
  CreateConnectionData,
  UpdateConnectionData,
  ConnectionType,
} from '../connections.types';

/**
 * Connection Management Service
 */
export class ConnectionService {
  /**
   * Get all connections
   */
  static async getAllConnections(): Promise<Connection[]> {
    try {
      const connections = await db.connection.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return connections.map(conn => ({
        id: conn.id,
        type: conn.type as ConnectionType,
        baseUrl: conn.baseUrl,
        apiKey: conn.apiKey,
        provider: conn.provider ?? undefined,
        createdAt: conn.createdAt.toISOString(),
        updatedAt: conn.updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error('Error getting connections:', error);
      return [];
    }
  }

  /**
   * Get connection by ID
   */
  static async getConnectionById(id: string): Promise<Connection | null> {
    try {
      const connection = await db.connection.findUnique({
        where: { id },
      });

      if (!connection) return null;

      return {
        id: connection.id,
        type: connection.type as ConnectionType,
        baseUrl: connection.baseUrl,
        apiKey: connection.apiKey,
        provider: connection.provider ?? undefined,
        createdAt: connection.createdAt.toISOString(),
        updatedAt: connection.updatedAt.toISOString(),
      };
    } catch (error) {
      console.error('Error getting connection by ID:', error);
      return null;
    }
  }

  /**
   * Create new connection(s)
   */
  static async createConnections(data: CreateConnectionData | CreateConnectionData[]): Promise<Connection[]> {
    try {
      const connections = Array.isArray(data) ? data : [data];
      const results: Connection[] = [];

      for (const connData of connections) {
        const connection = await db.connection.create({
          data: {
            type: connData.type,
            baseUrl: connData.baseUrl,
            apiKey: connData.apiKey || null,
            ...(connData.provider ? { provider: connData.provider } : {}),
          },
        });

        results.push({
          id: connection.id,
          type: connection.type as ConnectionType,
          baseUrl: connection.baseUrl,
          apiKey: connection.apiKey,
          provider: connection.provider ?? undefined,
          createdAt: connection.createdAt.toISOString(),
          updatedAt: connection.updatedAt.toISOString(),
        });
      }

      return results;
    } catch (error) {
      console.error('Error creating connections:', error);
      throw error;
    }
  }

  /**
   * Update connection
   */
  static async updateConnection(id: string, data: Partial<CreateConnectionData>): Promise<Connection> {
    try {
      const connection = await db.connection.update({
        where: { id },
        data: {
          ...(data.type && { type: data.type }),
          ...(data.baseUrl && { baseUrl: data.baseUrl }),
          ...(data.apiKey !== undefined && { apiKey: data.apiKey }),
          ...(data.provider && { provider: data.provider }),
        },
      });

      return {
        id: connection.id,
        type: connection.type as ConnectionType,
        baseUrl: connection.baseUrl,
        apiKey: connection.apiKey,
        provider: connection.provider ?? undefined,
        createdAt: connection.createdAt.toISOString(),
        updatedAt: connection.updatedAt.toISOString(),
      };
    } catch (error) {
      console.error('Error updating connection:', error);
      throw error;
    }
  }

  /**
   * Delete connection
   */
  static async deleteConnection(id: string): Promise<boolean> {
    try {
      await db.connection.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      console.error('Error deleting connection:', error);
      return false;
    }
  }

  /**
   * Get connections by type
   */
  static async getConnectionsByType(type: ConnectionType): Promise<Connection[]> {
    try {
      const connections = await db.connection.findMany({
        where: { type },
        orderBy: { createdAt: 'desc' },
      });

      return connections.map(conn => ({
        id: conn.id,
        type: conn.type as ConnectionType,
        baseUrl: conn.baseUrl,
        apiKey: conn.apiKey,
        provider: conn.provider ?? undefined,
        createdAt: conn.createdAt.toISOString(),
        updatedAt: conn.updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error('Error getting connections by type:', error);
      return [];
    }
  }

  /**
   * Get connections by provider
   */
  static async getConnectionsByProvider(provider: string): Promise<Connection[]> {
    try {
      const connections = await db.connection.findMany({
        where: { provider },
        orderBy: { createdAt: 'desc' },
      });

      return connections.map(conn => ({
        id: conn.id,
        type: conn.type as ConnectionType,
        baseUrl: conn.baseUrl,
        apiKey: conn.apiKey,
        provider: conn.provider ?? undefined,
        createdAt: conn.createdAt.toISOString(),
        updatedAt: conn.updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error('Error getting connections by provider:', error);
      return [];
    }
  }

  /**
   * Test connection
   */
  static async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const connection = await this.getConnectionById(id);
      if (!connection) {
        return { success: false, message: 'Connection not found' };
      }

      // Basic validation
      if (!connection.baseUrl) {
        return { success: false, message: 'Base URL is required' };
      }

      // For now, just validate the URL format
      try {
        new URL(connection.baseUrl);
        return { success: true, message: 'Connection configuration is valid' };
      } catch {
        return { success: false, message: 'Invalid base URL format' };
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      return { success: false, message: 'Connection test failed' };
    }
  }
}
