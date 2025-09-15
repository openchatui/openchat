"use client"

import { useRouter } from "next/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Session } from "next-auth"
import { ADMIN_NAV_ITEMS, AdminTab, AdminNavItem } from "@/constants/admin"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ChatData } from "@/lib/chat/chat-store"

interface AdminLayoutProps {
    session: Session | null
    activeTab: AdminTab
    children: ReactNode
    initialChats?: ChatData[]
}

export function AdminSidebar({ session, activeTab, children, initialChats = [] }: AdminLayoutProps) {
    const router = useRouter()

    const handleTabChange = (tab: string) => {
        const navItem = ADMIN_NAV_ITEMS.find(item => item.id === tab)
        if (navItem) {
            router.push(navItem.href)
        }
    }

    return (
        <SidebarProvider>
            <AppSidebar session={session} initialChats={initialChats} />
            <SidebarInset>
                <div className="flex h-screen bg-background">
                    {/* Admin Navigation Sidebar */}
                    <div className="w-64 bg-background border-r border-border p-4">
                        <div className="space-y-1">
                            {ADMIN_NAV_ITEMS.map((item: AdminNavItem) => {
                                const Icon = item.icon
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleTabChange(item.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                                            activeTab === item.id
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        )}
                                    >
                                        <Icon className="h-4 w-4 flex-shrink-0" />
                                        <span>{item.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-hidden">
                        <div className="h-full p-6 overflow-auto">
                            {children}
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
