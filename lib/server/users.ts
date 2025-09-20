import 'server-only'

import db from '@/lib/db'
import type { User } from '@/types/user'

const roleMap = {
  USER: 'user',
  ADMIN: 'admin',
} as const

export async function getAdminUsers(): Promise<User[]> {
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
  })

  const users: User[] = dbUsers.map((dbUser) => {
    const lastSession = dbUser.sessions[0]
    const lastActive = lastSession ? new Date(lastSession.expires) : undefined
    const oauthAccount = dbUser.accounts.find((account) => account.provider !== 'credentials')

    return {
      id: dbUser.id,
      name: dbUser.name || 'Unknown User',
      email: dbUser.email,
      role: roleMap[dbUser.role as keyof typeof roleMap] || 'user',
      userGroup: 'default',
      profilePicture: dbUser.image || undefined,
      lastActive: lastActive?.toISOString(),
      createdAt: dbUser.createdAt.toISOString(),
      oauthId: oauthAccount?.providerAccountId,
      updatedAt: dbUser.updatedAt.toISOString(),
    }
  })

  return users
}


