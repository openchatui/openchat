"use client"

import { cn } from "@/lib/utils"

interface AdminSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  items: Array<{ id: string; label: string; icon: any }>
}

export function AdminSidebar({ activeTab, onTabChange, items }: AdminSidebarProps) {
  return (
    <div className="w-64 bg-background border-r border-border p-4">
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
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
  )
}
