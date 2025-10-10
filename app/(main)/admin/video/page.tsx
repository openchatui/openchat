import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import db from "@/lib/db"
import { AdminVideo } from "@/components/admin/video/AdminVideo"

export default async function AdminVideoPage() {
  const session = await auth()
  if (!session || !session.user?.id) redirect("/login")

  const cfgRow = await db.config.findUnique({ where: { id: 1 } })
  const data = (cfgRow?.data || {}) as any
  const video = (data && typeof data === 'object' && (data as any).video) ? (data as any).video : {}
  const enabled = Boolean(video.enabled)
  const provider = typeof video.provider === 'string' ? String(video.provider) : 'openai'
  const openai = (video && typeof video.openai === 'object') ? video.openai as any : {}

  return (
    <AdminVideo
      session={session}
      initialEnabled={enabled}
      initialProvider={provider as any}
      initialOpenAI={{ model: openai.model || 'sora-2-pro', size: openai.size || '1280x720', seconds: typeof openai.seconds === 'number' ? openai.seconds : 4 }}
    />
  )
}


