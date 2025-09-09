"use client"

import * as React from "react"
import {
  Bot,
  Hash,
  MessageSquarePlus,
  NotebookPen,
  Search,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavModels } from "@/components/sidebar/nav-models"
import { NavUser } from "@/components/sidebar/nav-user"
import { SidebarLogo } from "@/components/sidebar/sidebar-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Session } from "next-auth"

// Navigation data
const data = {
  mainButtons: [
    {
      title: "New Chat",
      url: "/",
      icon: MessageSquarePlus,
      type: "button" as const,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
      type: "button" as const,
    },
    {
      title: "Notes",
      url: "#",
      icon: NotebookPen,
      type: "button" as const,
    },
    {
      title: "Workspaces",
      url: "#",
      icon: Users,
      type: "button" as const,
    },
  ],
  aiModels: [
    {
      title: "Llama",
      url: "#",
      icon: Bot,
      type: "button" as const,
    },
    {
      title: "gpt-4.1",
      url: "#",
      icon: Bot,
      type: "button" as const,
    },
    {
      title: "qwen2.5",
      url: "#",
      icon: Bot,
      type: "button" as const,
    },
  ],
  sections: [
    {
      title: "Channels",
      url: "#",
      type: "collapse" as const,
      items: [
        {
          title: "test",
          url: "#",
          icon: Hash,
        },
        {
          title: "ideas",
          url: "#",
          icon: Hash,
        },
      ],
    },
    {
      title: "Chats",
      url: "#",
      type: "collapse" as const,
      items: [
        {
          title: "Building a Comprehensive LLM Bot",
          url: "#",
        },
        {
          title: "React vs Svelte Comparison",
          url: "#",
        },
      ],
    },
  ]
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  session: Session | null
}

export function AppSidebar({ session, ...props }: AppSidebarProps) {
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "/avatars/default.jpg",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.mainButtons} />
        <NavModels items={data.aiModels} />
        <NavMain items={data.sections} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
