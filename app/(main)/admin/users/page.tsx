"use server"

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminUsers } from "@/components/admin/users/AdminUsers";
import { getAdminGroups } from "@/lib/server";
import { getAdminUsersLightPage } from "@/lib/server";

export default async function AdminUsersPage({ searchParams }: { searchParams?: Promise<{ q?: string | string[]; page?: string | string[] }> }) {
    const session = await auth();
    if (!session || !session.user?.id) redirect("/login");

    const sp = (await searchParams) || {}
    const qRaw = sp.q
    const pageRaw = sp.page
    const q = Array.isArray(qRaw) ? (qRaw[0] || '') : (qRaw || '')
    const pageStr = Array.isArray(pageRaw) ? (pageRaw[0] || '1') : (pageRaw || '1')
    const page = Number(pageStr) || 1

    async function UsersSection() {
        const [{ users }, groups] = await Promise.all([
            getAdminUsersLightPage({ q, page, pageSize: 20 }),
            getAdminGroups(),
        ])
        return <AdminUsers session={session} initialChats={[]} initialUsers={users} initialGroups={groups} />
    }

    return (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading users…</div>}>
            {/* Stream the heavy users section so TTFB stays fast */}
            <UsersSection />
        </Suspense>
    )
}
