"use server"

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminConnections } from "@/components/admin/connections/AdminConnections";
import { getUserChats } from "@/lib/chat-store";

export default async function AdminConnectionsPage() {
    const session = await auth();
    if (!session || !session.user?.id) redirect("/login");

    const chats = await getUserChats(session.user.id)
    return <AdminConnections session={session} initialChats={chats} />
}
