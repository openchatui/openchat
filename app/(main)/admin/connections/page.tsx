"use server"

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminConnections } from "@/components/admin/connections/AdminConnections";

export default async function AdminConnectionsPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return <AdminConnections session={session} />
}
