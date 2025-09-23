import 'server-only';
import db from '../../db';
import { unstable_cache } from 'next/cache';
import type { User } from '@/lib/server/user-management/user.types';

/**
 * User Management Service
 */
export class UserService {
  private static readonly roleMap = {
    USER: 'user',
    ADMIN: 'admin',
  } as const;

  /**
   * Get all users for admin interface
   */
  static async getAdminUsers(): Promise<User[]> {
    try {
      const dbUsers = await db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          accounts: {
            select: {
              providerAccountId: true,
              provider: true,
            },
          },
          sessions: {
            select: {
              expires: true,
            },
            orderBy: {
              expires: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return dbUsers.map((dbUser) => {
        const lastSession = dbUser.sessions[0];
        const lastActive = lastSession ? new Date(lastSession.expires) : undefined;
        const oauthAccount = dbUser.accounts.find((account) => account.provider !== 'credentials');

        return {
          id: dbUser.id,
          name: dbUser.name || 'Unknown User',
          email: dbUser.email,
          role: this.roleMap[dbUser.role as keyof typeof this.roleMap] || 'user',
          userGroup: 'default',
          profilePicture: dbUser.image || undefined,
          lastActive: lastActive?.toISOString(),
          createdAt: dbUser.createdAt.toISOString(),
          oauthId: oauthAccount?.providerAccountId,
          updatedAt: dbUser.updatedAt.toISOString(),
        };
      });
    } catch (error) {
      console.error('Error getting admin users:', error);
      return [];
    }
  }

  /**
   * Get users with optimized queries (lighter version)
   */
  static async getAdminUsersLight(): Promise<User[]> {
    try {
      const [dbUsers, sessionMaxByUser] = await Promise.all([
        db.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            createdAt: true,
            updatedAt: true,
            accounts: {
              select: {
                providerAccountId: true,
                provider: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        // Compute last active per user in a single aggregation
        (db as any).session.groupBy({
          by: ['userId'],
          _max: { expires: true },
        }).catch(() => []),
      ]);

      const userIdToLastActiveIso = new Map<string, string | undefined>();
      for (const row of sessionMaxByUser as Array<{ userId: string; _max: { expires: Date | null } }>) {
        const expires = row?._max?.expires;
        userIdToLastActiveIso.set(row.userId, expires ? new Date(expires).toISOString() : undefined);
      }

      return dbUsers.map((dbUser) => {
        const oauthAccount = dbUser.accounts.find((account) => account.provider !== 'credentials');
        return {
          id: dbUser.id,
          name: dbUser.name || 'Unknown User',
          email: dbUser.email,
          role: this.roleMap[dbUser.role as keyof typeof this.roleMap] || 'user',
          userGroup: 'default',
          profilePicture: dbUser.image || undefined,
          lastActive: userIdToLastActiveIso.get(dbUser.id),
          createdAt: dbUser.createdAt.toISOString(),
          oauthId: oauthAccount?.providerAccountId,
          updatedAt: dbUser.updatedAt.toISOString(),
        };
      });
    } catch (error) {
      console.error('Error getting admin users light:', error);
      return [];
    }
  }

  /**
   * Get paginated users
   */
  static getAdminUsersLightPage = unstable_cache(
    async function getAdminUsersLightPage(input: {
      q?: string;
      page?: number;
      pageSize?: number;
    } = {}): Promise<{ users: User[]; total: number }> {
      try {
        const q = String(input.q || '').trim();
        const page = Number.isFinite(input.page) && (input.page as number) > 0 ? Number(input.page) : 1;
        const pageSize = Number.isFinite(input.pageSize) && (input.pageSize as number) > 0 
          ? Math.min(Number(input.pageSize), 100) 
          : 20;

        const where: any = q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {};

        const [total, dbUsers] = await Promise.all([
          db.user.count({ where }),
          db.user.findMany({
            where,
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              image: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
        ]);

        const userIds = dbUsers.map(u => u.id);

        const [sessionMaxByUser, oauthAccounts] = await Promise.all([
          userIds.length > 0
            ? (db as any).session.groupBy({ 
                by: ['userId'], 
                where: { userId: { in: userIds } }, 
                _max: { expires: true } 
              })
            : [],
          userIds.length > 0
            ? (db as any).account.findMany({
                where: { userId: { in: userIds }, NOT: { provider: 'credentials' } },
                select: { userId: true, providerAccountId: true },
              })
            : [],
        ]);

        const userIdToLastActiveIso = new Map<string, string | undefined>();
        for (const row of sessionMaxByUser as Array<{ userId: string; _max: { expires: Date | null } }>) {
          const expires = row?._max?.expires;
          userIdToLastActiveIso.set(row.userId, expires ? new Date(expires).toISOString() : undefined);
        }

        const userIdToOauthId = new Map<string, string | undefined>();
        for (const acc of oauthAccounts as Array<{ userId: string; providerAccountId: string | null }>) {
          if (!userIdToOauthId.has(acc.userId) && acc.providerAccountId) {
            userIdToOauthId.set(acc.userId, String(acc.providerAccountId));
          }
        }

        const users: User[] = dbUsers.map((dbUser) => ({
          id: dbUser.id,
          name: dbUser.name || 'Unknown User',
          email: dbUser.email,
          role: UserService.roleMap[dbUser.role as keyof typeof UserService.roleMap] || 'user',
          userGroup: 'default',
          profilePicture: dbUser.image || undefined,
          lastActive: userIdToLastActiveIso.get(dbUser.id),
          createdAt: dbUser.createdAt.toISOString(),
          oauthId: userIdToOauthId.get(dbUser.id),
          updatedAt: dbUser.updatedAt.toISOString(),
        }));

        return { users, total };
      } catch (error) {
        console.error('Error getting paginated users:', error);
        return { users: [], total: 0 };
      }
    },
    ['admin-users-page'],
    { tags: ['admin-users'] }
  );

  /**
   * Update user settings
   */
  static async updateUserSettings(userId: string, settings: Record<string, any>): Promise<void> {
    try {
      await db.user.update({
        where: { id: userId },
        data: { settings },
      });
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  /**
   * Get user settings
   */
  static async getUserSettings(userId: string): Promise<Record<string, any>> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      return (user?.settings as Record<string, any>) || {};
    } catch (error) {
      console.error('Error getting user settings:', error);
      return {};
    }
  }
}

// Export individual functions for legacy compatibility
export const getAdminUsers = UserService.getAdminUsers;
export const getAdminUsersLight = UserService.getAdminUsersLight;
export const getAdminUsersLightPage = UserService.getAdminUsersLightPage;
