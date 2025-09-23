import { ConnectionService } from './management/connection.service';
import type {
  Connection,
  CreateConnectionData,
  UpdateConnectionData,
  ConnectionsConfig,
} from './connections.types';

// Connection Management
export {
  ConnectionService,
} from './management/connection.service';

// Type exports
export type {
  Connection,
  CreateConnectionData,
  UpdateConnectionData,
  ConnectionsConfig,
};

// Legacy compatibility - API utilities
export const connectionsApi = {
  async getAll() {
    return ConnectionService.getAllConnections();
  },
  
  async getById(id: string) {
    return ConnectionService.getConnectionById(id);
  },
  
  async create(data: CreateConnectionData) {
    return ConnectionService.createConnections(data);
  },
  
  async update(id: string, data: UpdateConnectionData) {
    return ConnectionService.updateConnection(id, data);
  },
  
  async delete(id: string) {
    return ConnectionService.deleteConnection(id);
  },
  
  async getConfig(): Promise<ConnectionsConfig> {
    // This would integrate with the config service
    throw new Error('getConfig not yet implemented in modular structure');
  },
  
  async updateConfig(payload: Partial<ConnectionsConfig>) {
    // This would integrate with the config service  
    throw new Error('updateConfig not yet implemented in modular structure');
  },
};
