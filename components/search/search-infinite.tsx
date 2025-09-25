"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ChatData } from "@/lib/features/chat"
import { cn } from "@/lib/utils"
import ChatPreview from "@/components/search/chat-preview"

interface SearchInfiniteProps {
  initialItems: ChatData[]
  initialNextOffset: number | null
  initialHasMore: boolean
  className?: string
}

export function SearchInfinite({ initialItems, initialNextOffset, initialHasMore, className }: SearchInfiniteProps) {
  const [items, setItems] = useState<ChatData[]>(initialItems)
  const [offset, setOffset] = useState<number>(initialNextOffset ?? initialItems.length)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [loading, setLoading] = useState<boolean>(false)
  const [selected, setSelected] = useState<ChatData | null>(initialItems[0] ?? null)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(d)
  }

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    setLoading(true)
    try {
      const limit = 100
      const res = await fetch(`/api/v1/chats?offset=${offset}&limit=${limit}`, { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      const newItems: ChatData[] = data.items || data.chats || []
      setItems(prev => [...prev, ...newItems])
      if (typeof data.nextOffset === 'number') setOffset(data.nextOffset)
      setHasMore(Boolean(data.hasMore))
    } finally {
      setLoading(false)
    }
  }, [offset, hasMore, loading])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting) {
        void loadMore()
      }
    }, { root: null, rootMargin: '200px', threshold: 0 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  useEffect(() => {
    // If nothing selected yet and we have items, select the most recent by default
    if (!selected && initialItems.length > 0) {
      setSelected(initialItems[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={cn("relative w-full", className)}>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No chats yet</div>
      ) : (
        <div className="md:h-[80vh] overflow-y-auto pr-0 md:pr-[540px]">
          <ul className="space-y-2">
            {items.map(c => (
              <li
                key={c.id}
                className="px-3 py-2 rounded-md hover:bg-accent/60 transition-colors"
                onMouseEnter={() => setSelected(c)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium truncate">{c.title || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.updatedAt as any)}</div>
                </div>
              </li>
            ))}
          </ul>
          <div ref={sentinelRef} className="h-10" />
          {loading && <div className="mt-2 text-xs text-muted-foreground">Loading…</div>}
        </div>
      )}

      {/* Hover preview panel (desktop) */}
      {selected && (
        <div
          ref={panelRef}
          className="hidden md:flex flex-col absolute top-0 right-0 w-[520px] h-[80vh] border rounded-lg bg-background shadow z-10"
          onMouseEnter={() => { /* keep open; persistent */ }}
        >
          <ChatPreview chat={selected} />
        </div>
      )}
    </div>
  )
}

export default SearchInfinite


