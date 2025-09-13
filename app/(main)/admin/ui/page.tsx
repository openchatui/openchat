"use server"

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminUI } from "@/components/admin/ui/AdminUI";
import { adminGetModels } from "@/actions/chat";
import { getUserChats } from "@/lib/chat-store";

export default async function AdminUIPage() {
    const session = await auth();
    if (!session || !session.user?.id) redirect("/login");

    const models = await adminGetModels();
    const modelIds = models.map((m: any) => m.providerId);
    const chats = await getUserChats(session.user.id)
    return <AdminUI session={session} modelIds={modelIds} initialChats={chats} />
}


