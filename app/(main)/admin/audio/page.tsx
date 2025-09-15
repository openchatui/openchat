"use server"

import { auth } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { AdminAudio } from "@/components/admin/audio/AdminAudio"
import { getUserChats } from "@/lib/chat/chat-store"

export default async function AdminAudioPage() {
  const session = await auth()
  if (!session || !session.user?.id) redirect("/login")

  const chats = await getUserChats(session.user.id)
  return <AdminAudio session={session} initialChats={chats} />
}


