"use server"

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminUsers } from "@/components/admin/users/AdminUsers";
import { ChatStore } from "@/lib/modules/chat";
import { listUsersForAdmin } from "@/lib/db/users.db";
import { listGroups as listGroupsFromDb } from "@/lib/db/groups.db";
import type { User } from "@/types/user.types";

export default async function AdminUsersPage({ searchParams }: { searchParams?: Promise<{ q?: string | string[]; page?: string | string[] }> }) {
    const session = await auth();
    if (!session || !session.user?.id) redirect("/login");
    
    // Check admin role
    const role = (session.user as { role?: string }).role;
    if (!role || role.toLowerCase() !== 'admin') {
        redirect('/404');
    }

    const sp = (await searchParams) || {}
    const qRaw = sp.q
    const pageRaw = sp.page
    const q = Array.isArray(qRaw) ? (qRaw[0] || '') : (qRaw || '')
    const pageStr = Array.isArray(pageRaw) ? (pageRaw[0] || '1') : (pageRaw || '1')
    const page = Number(pageStr) || 1

    // Direct DB access - avoid HTTP round-trip that fails with __Secure cookies on localhost
    const [dbUsers, dbGroups, chats] = await Promise.all([
        listUsersForAdmin(),
        listGroupsFromDb(),
        ChatStore.getUserChats(session.user.id)
    ])

    // Transform users to match frontend type
    const roleMap = { USER: 'user' as const, ADMIN: 'admin' as const }
    const MAX_AGE_DAYS = 30
    const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000
    
    const users: User[] = dbUsers.map(dbUser => {
      const lastSession = dbUser.sessions[0]
      const expiresAt = lastSession ? new Date(lastSession.expires) : undefined
      const inferredLastActive = expiresAt ? new Date(expiresAt.getTime() - MAX_AGE_MS) : undefined
      const oauthAccount = dbUser.accounts.find(account => account.provider !== 'credentials')

      return {
        id: dbUser.id,
        name: dbUser.name || 'Unknown User',
        email: dbUser.email,
        role: roleMap[dbUser.role as keyof typeof roleMap] || 'user',
        userGroup: 'default',
        profilePicture: dbUser.image || undefined,
        lastActive: inferredLastActive?.toISOString(),
        createdAt: dbUser.createdAt.toISOString(),
        oauthId: oauthAccount?.providerAccountId,
        updatedAt: dbUser.updatedAt.toISOString()
      }
    })

    const groups = dbGroups.map(g => ({
      id: g.id,
      name: g.name || undefined,
      description: g.description || undefined,
      createdAt: typeof g.createdAt === 'number' ? new Date(g.createdAt).toISOString() : g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: typeof g.updatedAt === 'number' ? new Date(g.updatedAt).toISOString() : g.updatedAt ? new Date(g.updatedAt).toISOString() : new Date().toISOString()
    }))

    return (
        <AdminUsers session={session} initialChats={chats} initialUsers={users} initialGroups={groups} />
    )
}
