"use server"

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminModels } from "@/components/admin/models/AdminModels";

export default async function AdminModelsPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return <AdminModels session={session} />
}
