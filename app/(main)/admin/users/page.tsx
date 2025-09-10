"use server"

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminUsers } from "@/components/admin/users/AdminUsers";

export default async function AdminUsersPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return <AdminUsers session={session} />
}
