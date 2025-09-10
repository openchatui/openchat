"use server";

import InitialChatClient from "@/components/chat/InitialChatClient";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserChats } from "@/lib/chat-store";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id as string;
  const chats = await getUserChats(userId);

  return (
    <InitialChatClient session={session} initialChats={chats} />
  )
}
