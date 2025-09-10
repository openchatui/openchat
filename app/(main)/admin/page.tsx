"use server"

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
    const session = await auth();
    if (!session) redirect("/login");

    // Redirect to users page as default
    redirect("/admin/users");
}

