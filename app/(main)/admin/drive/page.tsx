import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminDrive } from "@/components/admin/drive/AdminDrive"

export default async function AdminDrivePage() {
  const session = await auth()
  if (!session || !session.user?.id) redirect("/login")

  // Determine active storage provider from env (default local). Future: per-user or config override.
  const envProvider = (process.env.STORAGE_PROVIDER || "local").toLowerCase()
  const provider: "local" | "gdrive" = envProvider === "gdrive" ? "gdrive" : "local"

  return (
    <AdminDrive session={session} initialProvider={provider} />
  )
}


