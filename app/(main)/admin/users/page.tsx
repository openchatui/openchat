"use server"

import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { AdminUsers } from "@/components/admin/users/AdminUsers";
import { getUserChats } from "@/lib/chat/chat-store";
import { getAdminUsers } from "@/lib/server/users";

export default async function AdminUsersPage() {
    const session = await auth();
    if (!session || !session.user?.id) redirect("/login");

    const [chats, users] = await Promise.all([
        getUserChats(session.user.id),
        getAdminUsers(),
    ])
    return <AdminUsers session={session} initialChats={chats} initialUsers={users} />
}
