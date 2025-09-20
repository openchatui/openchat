"use server"

import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { AdminConnections } from "@/components/admin/connections/AdminConnections";
import { getUserChats } from "@/lib/chat/chat-store";
import { getConnections, getConnectionsConfig } from "@/actions/connections";

export default async function AdminConnectionsPage() {
    const session = await auth();
    if (!session || !session.user?.id) redirect("/login");

    const [chats, connections, cfg] = await Promise.all([
        getUserChats(session.user.id),
        getConnections(),
        getConnectionsConfig().then((r) => r.connections).catch(() => null),
    ])
    return <AdminConnections session={session} initialChats={chats} initialConnections={connections} initialConnectionsConfig={cfg} />
}
