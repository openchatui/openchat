import { SidebarInset } from "@/components/ui/sidebar"
import { Session } from "next-auth"
import { ADMIN_NAV_ITEMS, AdminTab, AdminNavItem } from "@/constants/admin"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ChatData } from "@/lib/features/chat"
import { NavLinks } from "@/components/admin/NavLinks"

interface AdminLayoutProps {
    session: Session | null
    activeTab: AdminTab
    children: ReactNode
    initialChats?: ChatData[]
}

export function AdminSidebar({ session, activeTab, children, initialChats = [] }: AdminLayoutProps) {

    return (
        <SidebarInset>
            <div className="flex h-screen bg-background">
                {/* Admin Navigation Sidebar */}
                <div className="w-64 bg-background border-r border-border p-4">
                    <NavLinks items={ADMIN_NAV_ITEMS} activeTab={activeTab} />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden">
                    <div className="h-full p-6 overflow-auto">
                        {children}
                    </div>
                </div>
            </div>
        </SidebarInset>
    )
}
