"use client"

import { useEffect, useRef, useState } from "react"
import type { ChatData } from "@/lib/features/chat"
import { cn } from "@/lib/utils"
import ChatPreview from "@/components/search/chat-preview"

interface SearchResultsPreviewProps {
  items: ChatData[]
  className?: string
}

export default function SearchResultsPreview({ items, className }: SearchResultsPreviewProps) {
  const [selected, setSelected] = useState<ChatData | null>(items[0] ?? null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!selected && items.length > 0) setSelected(items[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(d)
  }

  return (
    <div className={cn("relative w-full", className)}>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No results</div>
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
        </div>
      )}

      {selected && (
        <div
          ref={panelRef}
          className="hidden md:flex flex-col absolute top-0 right-0 w-[520px] h-[80vh] border rounded-lg bg-background shadow z-10"
        >
          <ChatPreview chat={selected} />
        </div>
      )}
    </div>
  )
}


