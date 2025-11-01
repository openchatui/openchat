"use client"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { ADMIN_NAV_ITEMS, AdminTab } from "@/constants/admin"
import { ReactNode, useMemo } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

interface AdminLayoutProps {
  activeTab?: AdminTab
  children: ReactNode
}

export function AdminSidebar({ activeTab, children }: AdminLayoutProps) {
  const pathname = usePathname()
  const computedActiveTab: AdminTab | undefined = useMemo(() => {
    const match = ADMIN_NAV_ITEMS.find(item => pathname?.startsWith(item.href))
    return match?.id as AdminTab | undefined
  }, [pathname])
  const currentTab = (activeTab ?? computedActiveTab) as AdminTab | undefined

    return (
        <SidebarInset>
            <div className="flex md:flex-row flex-col min-h-screen bg-background">
                {/* Mobile Top Nav (h-scroll) */}
                <div className="md:hidden sticky top-0 z-10 bg-background border-b border-border">
                    <div className="flex items-center gap-2 px-3 py-2">
                        <SidebarTrigger />
                        <div className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {ADMIN_NAV_ITEMS.map((item) => {
                            const Icon = item.icon as React.ComponentType<{ className?: string }>
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    prefetch
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 text-sm rounded-md whitespace-nowrap",
                                        currentTab === item.id
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </Link>
                            )
                        })}
                        </div>
                    </div>
                </div>

                {/* Admin Navigation Sidebar (desktop) */}
                <div className="hidden md:block w-64 bg-background border-r border-border p-4">
                    <div className="space-y-1">
                        {ADMIN_NAV_ITEMS.map((item) => {
                            const Icon = item.icon as React.ComponentType<{ className?: string }>
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    prefetch
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                                        currentTab === item.id
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    <Icon className="h-4 w-4 flex-shrink-0" />
                                    <span>{item.label}</span>
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden">
                    <div className="h-full p-4 md:p-6 overflow-auto">
                        {children}
                    </div>
                </div>
            </div>
        </SidebarInset>
    )
}
