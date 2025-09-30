import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminDrive } from "@/components/admin/drive/AdminDrive"
import { getDriveProviderConfig } from "@/actions/drive"

export default async function AdminDrivePage() {
  const session = await auth()
  if (!session || !session.user?.id) redirect("/login")

  // Prefer configs table; fallback to env
  const provider = await getDriveProviderConfig()

  return (
    <AdminDrive session={session} initialProvider={provider} />
  )
}


