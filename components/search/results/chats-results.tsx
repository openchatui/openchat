"use server"

import { searchUserArchivedChats, searchUserChats } from "@/lib/features/search"
import type { ChatData } from "@/lib/features/chat"
import SearchResultsPreview from "@/components/search/search-results-preview"

interface ChatsResultsProps {
  userId: string
  query: string
  mentions: string[]
}

function formatDate(date: Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d)
}

export default async function ChatsResults({ userId, query, mentions }: ChatsResultsProps) {
  const mentionSet = new Set((mentions || []).map((m) => String(m).toLowerCase()))
  const scopeChats = mentionSet.has("chats")
  const scopeArchived = mentionSet.has("archived")
  const scopeNoneSpecified = !scopeChats && !scopeArchived

  let chats: ChatData[] = []
  let archived: ChatData[] = []

  if (scopeChats || scopeNoneSpecified) {
    chats = await searchUserChats(userId, { query, mentions })
  }
  if (scopeArchived || scopeNoneSpecified) {
    archived = await searchUserArchivedChats(userId, { query, mentions })
  }

  // If the scope is explicitly @chats (and not archived), render with preview panel
  if (scopeChats && !scopeArchived) {
    return (
      <div className="mt-4 space-y-6">
        <div>
          <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Chats</div>
          <SearchResultsPreview items={chats} />
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-6">
      {(scopeChats || scopeNoneSpecified) && (
        <div>
          <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Chats</div>
          {chats.length === 0 ? (
            <div className="text-sm text-muted-foreground">No results</div>
          ) : (
            <ul className="space-y-2">
              {chats.map((c) => (
                <li key={c.id} className="px-3 py-2 rounded-md hover:bg-accent/60 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium truncate">{c.title || "Untitled"}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.updatedAt as any)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(scopeArchived || scopeNoneSpecified) && (
        <div>
          <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Archived</div>
          {archived.length === 0 ? (
            <div className="text-sm text-muted-foreground">No results</div>
          ) : (
            <ul className="space-y-2">
              {archived.map((c) => (
                <li key={c.id} className="px-3 py-2 rounded-md hover:bg-accent/60 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium truncate">{c.title || "Untitled"}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.updatedAt as any)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}


