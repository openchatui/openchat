"use client"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Session } from "next-auth"
import { ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { SETTINGS_NAV_ITEMS, SettingsNavItem } from "@/constants/settings"
import { cn } from "@/lib/utils"

interface SettingsLayoutProps {
  session: Session | null
  children: ReactNode
}

export function SettingsSidebar({ session, children }: SettingsLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleTabChange = (href: string) => {
    router.push(href)
  }

  return (
    <SidebarProvider>
      <AppSidebar session={session} />
      <SidebarInset>
        <div className="flex h-screen bg-background">
          <div className="w-64 bg-background border-r border-border p-4">
            <div className="space-y-1">
              {SETTINGS_NAV_ITEMS.map((item: SettingsNavItem) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left",
                      isActive
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
