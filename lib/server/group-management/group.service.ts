import 'server-only';
import db from '../../db';
import type { Group } from '@/lib/server/group-management/group.types';

/**
 * Group Management Service
 */
export class GroupService {
  /**
   * Get all groups for admin interface
   */
  static async getAdminGroups(): Promise<Group[]> {
    try {
      const dbGroups = await (db as any).group.findMany({
        orderBy: { createdAt: 'desc' },
      });

      const groups: Group[] = (dbGroups || []).map((g: any) => {
        const userIds: string[] = Array.isArray(g.userIds)
          ? g.userIds
          : Array.isArray(g.user_ids)
            ? g.user_ids
            : typeof g.userIds === 'object' && g.userIds !== null && 'set' in g.userIds
              ? (g.userIds.set as string[])
              : [];

        return {
          id: g.id,
          name: g.name ?? undefined,
          description: g.description ?? undefined,
          userId: g.userId ?? g.user_id ?? undefined,
          userIds,
          userCount: Array.isArray(userIds) ? userIds.length : 0,
          createdAt: g.createdAt ? new Date((Number(g.createdAt) || 0) * 1000).toISOString() : undefined,
          updatedAt: g.updatedAt ? new Date((Number(g.updatedAt) || 0) * 1000).toISOString() : undefined,
          permissions: g.permissions ?? undefined,
        };
      });

      return groups;
    } catch (error) {
      console.error('Error getting admin groups:', error);
      return [];
    }
  }

  /**
   * Create a new group
   */
  static async createGroup(data: {
    name: string;
    description?: string;
    userId: string;
    userIds?: string[];
    permissions?: any;
  }): Promise<Group> {
    try {
      const group = await (db as any).group.create({
        data: {
          name: data.name,
          description: data.description,
          userId: data.userId,
          userIds: data.userIds || [],
          permissions: data.permissions || {},
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        },
      });

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        userId: group.userId,
        userIds: group.userIds || [],
        userCount: (group.userIds || []).length,
        createdAt: new Date(group.createdAt * 1000).toISOString(),
        updatedAt: new Date(group.updatedAt * 1000).toISOString(),
        permissions: group.permissions,
      };
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  /**
   * Update a group
   */
  static async updateGroup(
    groupId: string, 
    data: Partial<{
      name: string;
      description: string;
      userIds: string[];
      permissions: any;
    }>
  ): Promise<Group> {
    try {
      const updateData: any = {
        ...data,
        updatedAt: Math.floor(Date.now() / 1000),
      };

      const group = await (db as any).group.update({
        where: { id: groupId },
        data: updateData,
      });

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        userId: group.userId,
        userIds: group.userIds || [],
        userCount: (group.userIds || []).length,
        createdAt: new Date(group.createdAt * 1000).toISOString(),
        updatedAt: new Date(group.updatedAt * 1000).toISOString(),
        permissions: group.permissions,
      };
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }

  /**
   * Delete a group
   */
  static async deleteGroup(groupId: string): Promise<boolean> {
    try {
      await (db as any).group.delete({
        where: { id: groupId },
      });
      return true;
    } catch (error) {
      console.error('Error deleting group:', error);
      return false;
    }
  }

  /**
   * Add user to group
   */
  static async addUserToGroup(groupId: string, userId: string): Promise<boolean> {
    try {
      const group = await (db as any).group.findUnique({
        where: { id: groupId },
        select: { userIds: true },
      });

      if (!group) return false;

      const currentUserIds = Array.isArray(group?.userIds) ? group.userIds : [];
      if (currentUserIds.includes(userId)) return true; // Already in group

      const newUserIds = [...currentUserIds, userId];

      await (db as any).group.update({
        where: { id: groupId },
        data: {
          userIds: newUserIds,
          updatedAt: Math.floor(Date.now() / 1000),
        },
      });

      return true;
    } catch (error) {
      console.error('Error adding user to group:', error);
      return false;
    }
  }

  /**
   * Remove user from group
   */
  static async removeUserFromGroup(groupId: string, userId: string): Promise<boolean> {
    try {
      const group = await (db as any).group.findUnique({
        where: { id: groupId },
        select: { userIds: true },
      });

      if (!group) return false;

      const currentUserIds = Array.isArray(group?.userIds) ? group.userIds : [];
      const newUserIds = currentUserIds.filter((id: string) => id !== userId);

      await (db as any).group.update({
        where: { id: groupId },
        data: {
          userIds: newUserIds,
          updatedAt: Math.floor(Date.now() / 1000),
        },
      });

      return true;
    } catch (error) {
      console.error('Error removing user from group:', error);
      return false;
    }
  }

  /**
   * Get groups for a specific user
   */
  static async getUserGroups(userId: string): Promise<Group[]> {
    try {
      const allGroups = await this.getAdminGroups();
      return allGroups.filter(group => group.userIds?.includes(userId) ?? false);
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  }
}

// Export individual functions for legacy compatibility
export const getAdminGroups = GroupService.getAdminGroups;
