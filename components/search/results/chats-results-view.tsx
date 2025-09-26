"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import type { ChatData } from "@/lib/features/chat"
import { cn } from "@/lib/utils"
import ChatPreview from "@/components/search/chat-preview"

interface ChatsResultsViewProps {
  chats: ChatData[]
  archived: ChatData[]
  className?: string
}

export default function ChatsResultsView({ chats, archived, className }: ChatsResultsViewProps) {
  const [selected, setSelected] = useState<ChatData | null>(chats[0] ?? archived[0] ?? null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!selected) {
      if (chats.length > 0) setSelected(chats[0])
      else if (archived.length > 0) setSelected(archived[0])
    }
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

  const hasAny = (chats.length + archived.length) > 0

  return (
    <div className={cn("relative w-full", className)}>
      {!hasAny ? (
        <div className="text-sm text-muted-foreground">No results</div>
      ) : (
        <div className="md:h-[85vh] overflow-y-auto pr-0 md:pr-[540px]">
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Chats</div>
              {chats.length === 0 ? (
                <div className="text-sm text-muted-foreground">No results</div>
              ) : (
                <ul className="space-y-2">
                  {chats.map(c => (
                    <li
                      key={c.id}
                      className="px-3 py-2 rounded-md hover:bg-accent/60 transition-colors"
                      onMouseEnter={() => setSelected(c)}
                    >
                      <Link href={`/c/${c.id}`} className="block">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium truncate">{c.title || "Untitled"}</div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.updatedAt as any)}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Archived</div>
              {archived.length === 0 ? (
                <div className="text-sm text-muted-foreground">No results</div>
              ) : (
                <ul className="space-y-2">
                  {archived.map(c => (
                    <li
                      key={c.id}
                      className="px-3 py-2 rounded-md hover:bg-accent/60 transition-colors"
                      onMouseEnter={() => setSelected(c)}
                    >
                      <Link href={`/c/${c.id}`} className="block">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium truncate">{c.title || "Untitled"}</div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.updatedAt as any)}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="h-10" />
        </div>
      )}

      {selected && (
        <div
          ref={panelRef}
          className="hidden md:flex flex-col absolute top-0 right-0 w-[520px] h-[80vh] rounded-lg bg-background shadow z-10"
        >
          <ChatPreview chat={selected} />
        </div>
      )}
    </div>
  )
}


