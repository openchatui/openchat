import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminDrive } from "@/components/admin/drive/AdminDrive"
import { getDriveConfig } from "@/lib/api/drive"

export default async function AdminDrivePage() {
  const session = await auth()
  if (!session || !session.user?.id) redirect("/login")

  const initialConfig = await getDriveConfig()

  return (
    <AdminDrive session={session} initialConfig={initialConfig} />
  )
}


