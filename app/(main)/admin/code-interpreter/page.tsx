import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminCodeInterpreter } from "@/components/admin/code-interpreter/AdminCodeInterpreter"
import { getCodeInterpreterConfig } from "@/actions/code-interpreter"
import { ChatStore } from "@/lib/features/chat"

export default async function AdminCodeInterpreterPage() {
  const session = await auth()
  if (!session || !session.user?.id) redirect("/login")

  const [cfg] = await Promise.all([
    getCodeInterpreterConfig(),
  ])
  return <AdminCodeInterpreter session={session} initialConfig={cfg} />
}


