import { auth } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import db from "@/lib/db"
import { AdminSidebar } from "@/components/admin/AdminSidebar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!user || user.role?.toLowerCase() !== "admin") {
    notFound()
  }

  return <AdminSidebar>{children}</AdminSidebar>
}


