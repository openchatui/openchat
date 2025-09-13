"use client"

import Link from "next/link"
import { ChevronRight, MessageSquare, Trash2, MoreHorizontal } from "lucide-react"
import { useState } from "react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePathname } from "next/navigation"
import type { ChatData } from "@/lib/chat-store"
import { useChatTitles } from "@/hooks/useChatTitles"

interface NavChatsProps {
  chats: ChatData[]
}

export function NavChats({ chats }: NavChatsProps) {
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname()
  const { titles } = useChatTitles(chats)

  // Group chats by date buckets: Today, Yesterday, Past 30 days, then by Month
  const sections = (() => {
    // Ensure newest first
    const sorted = [...chats].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    const thirtyDaysAgo = new Date(startOfToday)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()

    const buckets: Record<string, ChatData[]> = {
      Today: [],
      Yesterday: [],
      'Past 30 days': [],
    }
    const monthBuckets: Record<string, ChatData[]> = {}

    for (const chat of sorted) {
      const d = new Date(chat.updatedAt)
      if (isSameDay(d, startOfToday)) {
        buckets['Today'].push(chat)
        continue
      }
      if (isSameDay(d, startOfYesterday)) {
        buckets['Yesterday'].push(chat)
        continue
      }
      if (d >= thirtyDaysAgo) {
        buckets['Past 30 days'].push(chat)
        continue
      }
      const monthName = d.toLocaleString(undefined, { month: 'long' })
      const label = d.getFullYear() === now.getFullYear() ? `${monthName}` : `${monthName} ${d.getFullYear()}`
      if (!monthBuckets[label]) monthBuckets[label] = []
      monthBuckets[label].push(chat)
    }

    // Order: Today, Yesterday, Past 30 days, then months by recency
    const monthLabels = Object.keys(monthBuckets)
    monthLabels.sort((a, b) => {
      // Parse labels back to month/year for ordering: most recent first
      const [ma, ya] = a.split(' ')
      const [mb, yb] = b.split(' ')
      const yearA = Number.isFinite(Number(ya)) ? parseInt(ya) : now.getFullYear()
      const yearB = Number.isFinite(Number(yb)) ? parseInt(yb) : now.getFullYear()
      const dateA = new Date(`${ma} 1, ${yearA}`)
      const dateB = new Date(`${mb} 1, ${yearB}`)
      return dateB.getTime() - dateA.getTime()
    })

    const result: { label: string; items: ChatData[] }[] = []
    for (const key of ['Today', 'Yesterday', 'Past 30 days'] as const) {
      if (buckets[key].length > 0) result.push({ label: key, items: buckets[key] })
    }
    for (const ml of monthLabels) {
      result.push({ label: ml, items: monthBuckets[ml] })
    }
    return result
  })()

  return (
    <SidebarGroup className="pt-0">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <SidebarMenu>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild className="">
              <SidebarMenuButton className="w-full justify-between">
                <span>Chats</span>
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub className="border-l-0 pl-0 ml-0 mx-0 px-0">
                {chats.length === 0 ? (
                  <SidebarMenuSubItem>
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      No chats yet
                    </div>
                  </SidebarMenuSubItem>
                ) : (
                  sections.map(({ label, items }) => (
                    <div key={label} className="space-y-1">
                      <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground tracking-wide">
                        {label}
                      </div>
                      {items.map((chat) => {
                        const isActive = pathname === `/c/${chat.id}`
                        const displayTitle = titles[chat.id] ?? (chat.title || 'New Chat')
                        return (
                          <SidebarMenuSubItem key={chat.id}>
                            <SidebarMenuSubButton asChild isActive={isActive} className="w-full">
                              <Link href={`/c/${chat.id}`} className="group/chat relative w-full flex items-center">
                                <span className="relative flex-1 min-w-0 overflow-hidden pr-0 group-hover/chat:pr-7">
                                  <span
                                    className="block whitespace-nowrap overflow-hidden"
                                    style={{ WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 16px), transparent)', maskImage: 'linear-gradient(to right, black calc(100% - 16px), transparent)' }}
                                  >
                                    {displayTitle}
                                  </span>
                                </span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 opacity-0 group-hover/chat:opacity-100 absolute right-0 top-1/2 -translate-y-1/2"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                      }}
                                      aria-label="Chat actions"
                                    >
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem
                                      className=""
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        // TODO: Implement delete chat functionality
                                        console.log('Delete chat:', chat.id)
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-3 w-3" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </div>
                  ))
                )}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </SidebarMenu>
      </Collapsible>
    </SidebarGroup>
  )
}
