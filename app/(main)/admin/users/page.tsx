"use server"

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminUsers } from "@/components/admin/users/AdminUsers";
import { getUserChats } from "@/lib/chat-store";

export default async function AdminUsersPage() {
    const session = await auth();
    if (!session || !session.user?.id) redirect("/login");

    const chats = await getUserChats(session.user.id)
    return <AdminUsers session={session} initialChats={chats} />
}
