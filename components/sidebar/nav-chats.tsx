"use client"

import Link from "next/link"
import { ChevronRight, MessageSquare, Trash2, MoreHorizontal, Archive } from "lucide-react"
import { useEffect, useMemo, useRef, useState, useCallback } from "react"

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
import { usePathname, useRouter } from "next/navigation"
import type { ChatData } from "@/lib/features/chat"
import { useChatTitles } from "@/hooks/useChatTitles"
import { useTags } from "@/hooks/useTags"
import { archiveChatAction } from "@/actions/chat"
import { AnimatedLoader } from "@/components/ui/loader"

interface NavChatsProps {
  chats: ChatData[]
  timeZone?: string
}

export function NavChats({ chats, timeZone = 'UTC' }: NavChatsProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [allChats, setAllChats] = useState<ChatData[]>(chats)
  const [offset, setOffset] = useState<number>(chats.length)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)
  const initialPageRef = useRef<ChatData[]>(chats)
  const suppressLoadMoreRef = useRef<boolean>(false)
  const pathname = usePathname()
  const router = useRouter()
  // Avoid scanning large chat arrays when collapsed by passing empty list to the hook
  const effectiveChatsForTitles = isOpen ? allChats : []
  const { titles } = useChatTitles(effectiveChatsForTitles)
  // Trigger background tag generation like titles only on non-admin routes
  const tagsEnabled = !(pathname || '').startsWith('/admin')
  useTags(allChats, { enabled: tagsEnabled && isOpen })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Group chats by date buckets: Today, Yesterday, Past 30 days, then by Month
  const sections = useMemo(() => {
    // Ensure newest first (by created date)
    const sorted = [...allChats].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Use a consistent timezone provided from the server to avoid flicker
    const tz = timeZone || 'UTC'
    const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', timeZone: tz })

    const getZonedYMD = (date: Date) => {
      try {
        // Use Intl to format parts in the target time zone and extract Y/M/D
        const parts = new Intl.DateTimeFormat(undefined, {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).formatToParts(date)
        const y = Number(parts.find(p => p.type === 'year')?.value)
        const m = Number(parts.find(p => p.type === 'month')?.value)
        const d = Number(parts.find(p => p.type === 'day')?.value)
        return { y, m, d }
      } catch {
        // Fallback to UTC if timezone unsupported
        return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() }
      }
    }

    const isSameZonedDay = (a: Date, b: Date) => {
      const aa = getZonedYMD(a)
      const bb = getZonedYMD(b)
      return aa.y === bb.y && aa.m === bb.m && aa.d === bb.d
    }

    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setUTCDate(now.getUTCDate() - 1)
    const thirtyDaysAgoAbs = new Date(now)
    thirtyDaysAgoAbs.setUTCDate(now.getUTCDate() - 30)

    const buckets: Record<string, ChatData[]> = {
      Today: [],
      Yesterday: [],
      'Past 30 days': [],
    }
    // Key month buckets by YYYY-MM for stable sorting
    const monthBuckets: Record<string, ChatData[]> = {}

    for (const chat of sorted) {
      const d = new Date(chat.createdAt)
      if (isSameZonedDay(d, now)) {
        buckets['Today'].push(chat)
        continue
      }
      if (isSameZonedDay(d, yesterday)) {
        buckets['Yesterday'].push(chat)
        continue
      }
      if (d.getTime() >= thirtyDaysAgoAbs.getTime()) {
        buckets['Past 30 days'].push(chat)
        continue
      }
      const { y, m } = getZonedYMD(d)
      const monthKey = `${y}-${String(m).padStart(2, '0')}`
      if (!monthBuckets[monthKey]) monthBuckets[monthKey] = []
      monthBuckets[monthKey].push(chat)
    }

    // Order: Today, Yesterday, Past 30 days, then months by recency (using YYYY-MM keys)
    const monthKeys = Object.keys(monthBuckets).sort((a, b) => b.localeCompare(a))

    const result: { label: string; items: ChatData[] }[] = []
    for (const key of ['Today', 'Yesterday', 'Past 30 days'] as const) {
      if (buckets[key].length > 0) result.push({ label: key, items: buckets[key] })
    }
    for (const mk of monthKeys) {
      const [yearStr, monthStr] = mk.split('-')
      const year = parseInt(yearStr, 10)
      const monthIndex = parseInt(monthStr, 10) - 1
      // Construct a date for the first of the month in the target zone by formatting
      const monthDate = new Date(Date.UTC(year, monthIndex, 1))
      const monthName = monthFormatter.format(monthDate)
      const sameYear = String(getZonedYMD(now).y) === yearStr
      const label = sameYear ? `${monthName}` : `${monthName} ${year}`
      result.push({ label, items: monthBuckets[mk] })
    }
    return result
  }, [allChats, timeZone])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || suppressLoadMoreRef.current) return
    try {
      setLoading(true)
      const limit = 100
      const res = await fetch(`/api/v1/chats?offset=${offset}&limit=${limit}`)
      if (!res.ok) return
      const data = await res.json()
      const items: ChatData[] = data.items || data.chats || []
      setAllChats(prev => [...prev, ...items])
      if (typeof data.nextOffset === 'number') {
        setOffset(data.nextOffset)
      }
      setHasMore(Boolean(data.hasMore))
    } finally {
      setLoading(false)
    }
  }, [offset, loading, hasMore])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && isOpen) {
        void loadMore()
      }
    }, { root: null, rootMargin: '200px', threshold: 0 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, isOpen])

  const resetToFirstPage = useCallback(() => {
    const initial = initialPageRef.current || []
    setAllChats(initial)
    setOffset(initial.length)
    setHasMore(true)
    suppressLoadMoreRef.current = true
    setTimeout(() => { suppressLoadMoreRef.current = false }, 300)
  }, [])

  // Optimistically add the current chat to the sidebar on navigation to /c/{id}
  useEffect(() => {
    const p = String(pathname || '')
    if (!p.startsWith('/c/')) return
    const id = p.slice(3).split(/[\/#?]/)[0]
    if (!id) return
    setAllChats(prev => {
      if (prev.some(c => c.id === id)) return prev
      const now = new Date()
      const optimistic: ChatData = {
        id,
        userId: '',
        title: 'New Chat',
        createdAt: now as any,
        updatedAt: now as any,
        messages: [],
        archived: false,
        tags: [],
        modelId: null,
      }
      return [optimistic, ...prev]
    })
  }, [pathname])

  useEffect(() => {
    const topEl = topRef.current
    if (!topEl) return
    const obs = new IntersectionObserver((entries) => {
      const e = entries[0]
      if (e.isIntersecting && isOpen && allChats.length > (initialPageRef.current?.length || 0) && !loading) {
        resetToFirstPage()
      }
    }, { root: null, rootMargin: '0px', threshold: 0.01 })
    obs.observe(topEl)
    return () => obs.disconnect()
  }, [isOpen, allChats.length, loading, resetToFirstPage])

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
                <div ref={topRef} />
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
                                      onClick={async (e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        try {
                                          await archiveChatAction(chat.id)
                                          try {
                                            const bc = new BroadcastChannel('chats')
                                            bc.postMessage({ type: 'archived', id: chat.id })
                                            bc.close()
                                          } catch {}
                                        } finally {
                                          router.refresh()
                                        }
                                      }}
                                    >
                                      <Archive className="mr-2 h-3 w-3" />
                                      Archive
                                    </DropdownMenuItem>
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
                <div ref={loadMoreRef} className="flex items-center justify-center py-2">
                  {loading && <AnimatedLoader className="h-4 w-4 text-muted-foreground" />}
                </div>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </SidebarMenu>
      </Collapsible>
    </SidebarGroup>
  )
}
