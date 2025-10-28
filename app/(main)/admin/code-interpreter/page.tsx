import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminCodeInterpreter } from "@/components/admin/code-interpreter/AdminCodeInterpreter"
import { getCodeConfig } from "@/lib/api/code"
import { ChatStore } from "@/lib/modules/chat"

export default async function AdminCodeInterpreterPage() {
  const session = await auth()
  if (!session || !session.user?.id) redirect("/login")

  const [cfg] = await Promise.all([
    getCodeConfig(),
  ])
  return <AdminCodeInterpreter session={session} initialConfig={cfg} />
}


