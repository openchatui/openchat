"use server"

import { AdminLayout } from "@/components/admin/admin-layout"
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
    const session = await auth();
    if (!session) redirect("/login");
    
    return <AdminLayout session={session}/>
}
