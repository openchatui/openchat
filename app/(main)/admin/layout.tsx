import { auth } from "@/lib/auth/auth"
import { notFound, redirect } from "next/navigation"
import db from "@/lib/db"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!user || user.role !== "ADMIN") {
    notFound()
  }

  return <>{children}</>
}


