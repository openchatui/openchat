import { AppSidebar } from "@/components/sidebar/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ChatInput } from "@/components/chat/chat-input"
import { Session } from "next-auth"
import ChatMessages from "./chat-messages"

interface ChatClientProps {
  session: Session | null
}

export default function ChatClient({ session }: ChatClientProps) {
  return (
    <SidebarProvider>
      <AppSidebar session={session} />
      <SidebarInset>
        <ChatMessages/>
        <ChatInput />
      </SidebarInset>
    </SidebarProvider>
  )
}
