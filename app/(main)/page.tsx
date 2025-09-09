"use server";

import ChatClient from "@/components/chat/ChatClient";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <ChatClient session={session}/>
  )
}
