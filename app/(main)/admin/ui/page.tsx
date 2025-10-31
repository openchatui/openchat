"use server"

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminUI } from "@/components/admin/ui/AdminUI";
import { listModels } from "@/lib/api/models";
import { ChatStore } from "@/lib/modules/chat";

export default async function AdminUIPage() {
    const session = await auth();
    if (!session || !session.user?.id) redirect("/login");

    const models = await listModels();
    const modelIds = models.map((m: any) => m.providerId);
    const chats = await ChatStore.getUserChats(session.user.id)
    return <AdminUI session={session} modelIds={modelIds} initialChats={chats} />
}


