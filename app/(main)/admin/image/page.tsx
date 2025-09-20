import { auth } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { AdminImage } from "@/components/admin/image/AdminImage"
import { getUserChats } from "@/lib/chat/chat-store"
import db from "@/lib/db"

export default async function AdminImagePage() {
  const session = await auth()
  if (!session || !session.user?.id) redirect("/login")

  const chats = await getUserChats(session.user.id)

  // Load image provider and enable flag on the server
  const cfgRow = await (db as any).config.findUnique({ where: { id: 1 } })
  const data = (cfgRow?.data || {}) as any
  const image = (data && typeof data === 'object' && (data as any).image) ? (data as any).image : {}
  const provider = (typeof image.provider === 'string' && ['openai','comfyui','automatic1111'].includes(String(image.provider)))
    ? String(image.provider)
    : 'openai'
  const connections = (data && typeof data === 'object' && (data as any).connections) ? (data as any).connections : {}
  const openai = (connections && typeof connections.openai === 'object') ? connections.openai as any : {}
  const enabled = Boolean(openai.enable)

  return <AdminImage session={session} initialChats={chats} initialProvider={provider as any} initialEnabled={enabled} />
}



