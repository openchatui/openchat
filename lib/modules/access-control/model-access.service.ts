import db from '../../db';
import { PermissionsService } from './permissions.service';

interface ModelLikeAC {
  id: string;
  userId: string;
  accessControl?: any | null;
}

// Model Access Control Service
export class ModelAccessService {
  // Convert value to string array
  private static toStringArray(val: any): string[] {
    if (Array.isArray(val)) return val.filter((v) => typeof v === 'string');
    return [];
  }

  // Check if user can read a model
  static async canReadModel(userId: string, model: ModelLikeAC): Promise<boolean> {
    try {
      const role = await PermissionsService.getUserRole(userId);
      if (role === 'ADMIN' || role === 'admin') return true;
      if (model.userId === userId) return true;

      const ac = (model as any).accessControl || (model as any).access_control || {};
      const read = (ac?.read || {}) as any;
      
      // Check user_ids
      const userIds = ModelAccessService.toStringArray(read.user_ids);
      if (userIds.includes(userId)) return true;
      
      // Check group_ids
      const groupIds = ModelAccessService.toStringArray(read.group_ids);
      if (groupIds.length === 0) return false;
      
      const userGroupIds = await PermissionsService.getUserGroupIds(userId);
      return userGroupIds.some((gid) => groupIds.includes(gid));
    } catch (error) {
      console.error('Error checking model read access:', error);
      return false;
    }
  }

  // Check if user can write to a model
  static async canWriteModel(userId: string, model: ModelLikeAC): Promise<boolean> {
    try {
      const role = await PermissionsService.getUserRole(userId);
      if (role === 'ADMIN' || role === 'admin') return true;
      if (model.userId === userId) return true;

      const ac = (model as any).accessControl || (model as any).access_control || {};
      const write = (ac?.write || {}) as any;
      
      // Check user_ids
      const userIds = ModelAccessService.toStringArray(write.user_ids);
      if (userIds.includes(userId)) return true;
      
      // Check group_ids
      const groupIds = ModelAccessService.toStringArray(write.group_ids);
      if (groupIds.length === 0) return false;
      
      const userGroupIds = await PermissionsService.getUserGroupIds(userId);
      return userGroupIds.some((gid) => groupIds.includes(gid));
    } catch (error) {
      console.error('Error checking model write access:', error);
      return false;
    }
  }

  // Check if user can read model by ID
  static async canReadModelById(userId: string, modelId: string): Promise<boolean> {
    try {
      const model = await db.model.findUnique({ 
        where: { id: modelId }, 
        select: { id: true, userId: true, accessControl: true } 
      });
      
      if (!model) return false;
      return ModelAccessService.canReadModel(userId, model as any);
    } catch (error) {
      console.error('Error checking model read access by ID:', error);
      return false;
    }
  }

  // Filter models that are readable by user
  static async filterModelsReadableByUser(userId: string, models: any[]): Promise<any[]> {
    try {
      const results: any[] = [];
      
      for (const model of models) {
        if (await ModelAccessService.canReadModel(userId, model)) {
          results.push(model);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error filtering readable models:', error);
      return [];
    }
  }

  // Get models accessible to user
  static async getAccessibleModels(userId: string): Promise<any[]> {
    try {
      const allModels = await db.model.findMany();
      return ModelAccessService.filterModelsReadableByUser(userId, allModels);
    } catch (error) {
      console.error('Error getting accessible models:', error);
      return [];
    }
  }
}

// Export individual functions for legacy compatibility
export const canReadModel = ModelAccessService.canReadModel;
export const canWriteModel = ModelAccessService.canWriteModel;
export const canReadModelById = ModelAccessService.canReadModelById;
export const filterModelsReadableByUser = ModelAccessService.filterModelsReadableByUser;
