"use client"

import { useState } from "react"
import { AdminSidebar } from "./admin-sidebar"
import { ConnectionsPanel } from "./panels/connections"
import { UsersPanel } from "./panels/users"
import { ModelsPanel } from "./panels/models"
import { SidebarInset, SidebarProvider } from "../ui/sidebar"
import { AppSidebar } from "../sidebar/app-sidebar"
import { Session } from "next-auth"
import { Users, Link, Box } from "lucide-react"

interface ChatClientProps {
    session: Session | null
  }

// Panels configuration: id -> metadata and component
const panels = {
  users: {
    label: "Users",
    icon: Users,
    component: UsersPanel,
  },
  connections: {
    label: "Connections",
    icon: Link,
    component: ConnectionsPanel,
  },
  models:{
    label: "Models",
    icon: Box,
    component: ModelsPanel,
  }
} as const

export function AdminLayout({ session }: ChatClientProps) {
    const [activeTab, setActiveTab] = useState<keyof typeof panels>("users")

    const ActivePanel = panels[activeTab].component
    const navigationItems = (Object.keys(panels) as Array<keyof typeof panels>).map((id) => ({
      id,
      label: panels[id].label,
      icon: panels[id].icon,
    }))

    return (
      <SidebarProvider>
      <AppSidebar session={session} />
      <SidebarInset>
          <div className="flex h-screen bg-background">
            <AdminSidebar
              activeTab={activeTab}
              onTabChange={(tab) => setActiveTab(tab as keyof typeof panels)}
              items={navigationItems}
            />
            <div className="flex-1 p-8">
              <div className="w-full">
                <ActivePanel />
              </div>
            </div>
          </div>      
      </SidebarInset>
      </SidebarProvider>
    )
}
