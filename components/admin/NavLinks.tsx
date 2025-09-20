"use client"

import Link from "next/link"
import { useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { AdminNavItem, AdminTab } from "@/constants/admin"

interface NavLinksProps {
  items: AdminNavItem[]
  activeTab: AdminTab
}

export function NavLinks({ items, activeTab }: NavLinksProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Warm up all admin routes for instant navigation
  useEffect(() => {
    items.forEach((item) => {
      if (typeof item.href === 'string') {
        try { router.prefetch(item.href) } catch {}
      }
    })
  }, [items, router])

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon as any
        return (
          <Link
            key={item.id}
            href={item.href}
            prefetch
            onClick={(e) => {
              // Use a transition to keep UI responsive
              e.preventDefault()
              startTransition(() => router.push(item.href))
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
              activeTab === item.id
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
  )
}


