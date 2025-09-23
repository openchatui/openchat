import 'server-only';
import db from '../../db';
import type { 
  GroupPermissions, 
  EffectivePermissions, 
  WorkspacePerms, 
  SharingPerms, 
  ChatPerms, 
  FeaturesPerms 
} from '@/lib/server/access-control/permissions.types';

type Role = 'ADMIN' | 'USER' | 'admin' | 'user';

interface MinimalUser {
  id: string;
  role: Role;
}

/**
 * Access Control and Permissions Service
 */
export class PermissionsService {
  /**
   * Create default permission structures
   */
  private static createDefaultWorkspace(): WorkspacePerms {
    return { models: false, knowledge: false, prompts: false, tools: false };
  }

  private static createDefaultSharing(): SharingPerms {
    return { public_models: false, public_knowledge: false, public_prompts: false, public_tools: false };
  }

  private static createDefaultChat(): ChatPerms {
    return {
      controls: false,
      valves: false,
      system_prompt: false,
      params: false,
      file_upload: false,
      delete: false,
      edit: false,
      share: false,
      export: false,
      stt: false,
      tts: false,
      call: false,
      multiple_models: false,
      temporary: false,
      temporary_enforced: false,
    };
  }

  private static createDefaultFeatures(): FeaturesPerms {
    return { 
      direct_tool_servers: false, 
      web_search: false, 
      image_generation: false, 
      code_interpreter: false, 
      notes: false 
    };
  }

  private static createFullWorkspace(): WorkspacePerms {
    return { models: true, knowledge: true, prompts: true, tools: true };
  }

  private static createFullSharing(): SharingPerms {
    return { public_models: true, public_knowledge: true, public_prompts: true, public_tools: true };
  }

  private static createFullChat(): ChatPerms {
    return {
      controls: true,
      valves: true,
      system_prompt: true,
      params: true,
      file_upload: true,
      delete: true,
      edit: true,
      share: true,
      export: true,
      stt: true,
      tts: true,
      call: true,
      multiple_models: true,
      temporary: true,
      temporary_enforced: false,
    };
  }

  private static createFullFeatures(): FeaturesPerms {
    return { 
      direct_tool_servers: true, 
      web_search: true, 
      image_generation: true, 
      code_interpreter: true, 
      notes: true 
    };
  }

  /**
   * Get user role by ID
   */
  static async getUserRole(userId: string): Promise<Role | null> {
    try {
      const user = await db.user.findUnique({ 
        where: { id: userId }, 
        select: { role: true } 
      });
      return (user?.role as Role) ?? null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  /**
   * Get group IDs for a user
   */
  static async getUserGroupIds(userId: string): Promise<string[]> {
    try {
      const groups = await (db as any).group.findMany();
      const ids: string[] = [];
      
      for (const g of groups || []) {
        const raw = Array.isArray(g.userIds)
          ? g.userIds
          : Array.isArray(g.user_ids)
            ? g.user_ids
            : typeof g.userIds === 'object' && g.userIds !== null && 'set' in g.userIds
              ? (g.userIds.set as string[])
              : [];
        
        const memberIds: string[] = Array.isArray(raw) 
          ? raw.filter((v: any) => typeof v === 'string') 
          : [];
        
        if (memberIds.includes(userId)) {
          ids.push(String(g.id));
        }
      }
      
      return ids;
    } catch (error) {
      console.error('Error getting user group IDs:', error);
      return [];
    }
  }

  /**
   * Get effective permissions for a user
   */
  static async getEffectivePermissionsForUser(userId: string): Promise<EffectivePermissions> {
    try {
      const role = await PermissionsService.getUserRole(userId);
      const isAdmin = role === 'ADMIN' || role === 'admin';
      
      if (isAdmin) {
        return {
          workspace: PermissionsService.createFullWorkspace(),
          sharing: PermissionsService.createFullSharing(),
          chat: PermissionsService.createFullChat(),
          features: PermissionsService.createFullFeatures(),
        };
      }

      const groups = await (db as any).group.findMany();
      const userGroups = (groups || []).filter((g: any) => {
        const raw = Array.isArray(g.userIds)
          ? g.userIds
          : Array.isArray(g.user_ids)
            ? g.user_ids
            : typeof g.userIds === 'object' && g.userIds !== null && 'set' in g.userIds
              ? (g.userIds.set as string[])
              : [];
        
        const memberIds: string[] = Array.isArray(raw) 
          ? raw.filter((v: any) => typeof v === 'string') 
          : [];
        
        return memberIds.includes(userId);
      });

      const permissions: EffectivePermissions = {
        workspace: PermissionsService.createDefaultWorkspace(),
        sharing: PermissionsService.createDefaultSharing(),
        chat: PermissionsService.createDefaultChat(),
        features: PermissionsService.createDefaultFeatures(),
      };

      // Merge permissions from all user groups
      for (const g of userGroups) {
        const groupPerms: GroupPermissions = (g?.permissions || {}) as GroupPermissions;
        
        if (groupPerms?.workspace) {
          permissions.workspace.models = permissions.workspace.models || !!groupPerms.workspace.models;
          permissions.workspace.knowledge = permissions.workspace.knowledge || !!groupPerms.workspace.knowledge;
          permissions.workspace.prompts = permissions.workspace.prompts || !!groupPerms.workspace.prompts;
          permissions.workspace.tools = permissions.workspace.tools || !!groupPerms.workspace.tools;
        }
        
        if (groupPerms?.sharing) {
          permissions.sharing.public_models = permissions.sharing.public_models || !!groupPerms.sharing.public_models;
          permissions.sharing.public_knowledge = permissions.sharing.public_knowledge || !!groupPerms.sharing.public_knowledge;
          permissions.sharing.public_prompts = permissions.sharing.public_prompts || !!groupPerms.sharing.public_prompts;
          permissions.sharing.public_tools = permissions.sharing.public_tools || !!groupPerms.sharing.public_tools;
        }
        
        if (groupPerms?.chat) {
          const c = groupPerms.chat;
          permissions.chat.controls = permissions.chat.controls || !!c.controls;
          permissions.chat.valves = permissions.chat.valves || !!c.valves;
          permissions.chat.system_prompt = permissions.chat.system_prompt || !!c.system_prompt;
          permissions.chat.params = permissions.chat.params || !!c.params;
          permissions.chat.file_upload = permissions.chat.file_upload || !!c.file_upload;
          permissions.chat.delete = permissions.chat.delete || !!c.delete;
          permissions.chat.edit = permissions.chat.edit || !!c.edit;
          permissions.chat.share = permissions.chat.share || !!c.share;
          permissions.chat.export = permissions.chat.export || !!c.export;
          permissions.chat.stt = permissions.chat.stt || !!c.stt;
          permissions.chat.tts = permissions.chat.tts || !!c.tts;
          permissions.chat.call = permissions.chat.call || !!c.call;
          permissions.chat.multiple_models = permissions.chat.multiple_models || !!c.multiple_models;
          permissions.chat.temporary = permissions.chat.temporary || !!c.temporary;
          permissions.chat.temporary_enforced = permissions.chat.temporary_enforced || !!c.temporary_enforced;
        }
        
        if (groupPerms?.features) {
          permissions.features.direct_tool_servers = permissions.features.direct_tool_servers || !!groupPerms.features.direct_tool_servers;
          permissions.features.web_search = permissions.features.web_search || !!groupPerms.features.web_search;
          permissions.features.image_generation = permissions.features.image_generation || !!groupPerms.features.image_generation;
          permissions.features.code_interpreter = permissions.features.code_interpreter || !!groupPerms.features.code_interpreter;
          permissions.features.notes = permissions.features.notes || !!groupPerms.features.notes;
        }
      }

      return permissions;
    } catch (error) {
      console.error('Error getting effective permissions:', error);
      return {
        workspace: PermissionsService.createDefaultWorkspace(),
        sharing: PermissionsService.createDefaultSharing(),
        chat: PermissionsService.createDefaultChat(),
        features: PermissionsService.createDefaultFeatures(),
      };
    }
  }

  /**
   * Check if a specific feature is enabled for a user
   */
  static async isFeatureEnabled(userId: string, key: string): Promise<boolean> {
    try {
      const role = await PermissionsService.getUserRole(userId);
      if (role === 'ADMIN' || role === 'admin') return true;
      
      const eff = await PermissionsService.getEffectivePermissionsForUser(userId);
      const [group, prop] = key.split('.') as [keyof EffectivePermissions, string];
      
      if (!group || !prop) return false;
      
      const obj: any = (eff as any)[group];
      if (!obj) return false;
      
      return !!obj[prop];
    } catch (error) {
      console.error('Error checking feature enabled:', error);
      return false;
    }
  }
}

// Export individual functions for legacy compatibility
export const getUserRole = PermissionsService.getUserRole;
export const getUserGroupIds = PermissionsService.getUserGroupIds;
export const getEffectivePermissionsForUser = PermissionsService.getEffectivePermissionsForUser;
export const isFeatureEnabled = PermissionsService.isFeatureEnabled;
