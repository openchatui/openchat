"use server"

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminModels } from "@/components/admin/models/AdminModels";
import { adminGetModels, adminGetGroupedModels } from "@/actions/chat";

export default async function AdminModelsPage() {
    const session = await auth();
    if (!session) redirect("/login");

    // Load models server-side for better performance
    const [models, groupedModels] = await Promise.all([
        adminGetModels(),
        adminGetGroupedModels()
    ]);

    return (
        <AdminModels
            session={session}
            initialModels={models}
            initialGroupedModels={groupedModels}
        />
    );
}
