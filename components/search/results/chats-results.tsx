"use server"

import { searchUserArchivedChats, searchUserChats } from "@/lib/features/search"
import { ChatStore, type ChatData } from "@/lib/features/chat"
import ChatsResultsView from "@/components/search/results/chats-results-view"
import SearchInfinite from "@/components/search/search-infinite"

interface ChatsResultsProps {
  userId: string
  query?: string
  mentions?: string[]
}

export default async function ChatsResults({ userId, query, mentions }: ChatsResultsProps) {
  const q = (query || "").trim()
  if (!q) {
    const page = await ChatStore.getUserChatsPage(userId, { offset: 0, limit: 100 })
    return (
      <div className="mt-4 space-y-6">
        <div>
          <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Chats</div>
          <SearchInfinite initialItems={page.items as ChatData[]} initialNextOffset={page.nextOffset} initialHasMore={page.hasMore} />
        </div>
      </div>
    )
  }

  const mentionSet = new Set((mentions || []).map((m) => String(m).toLowerCase()))
  const scopeChats = mentionSet.has("chats")
  const scopeArchived = mentionSet.has("archived")
  const scopeNoneSpecified = !scopeChats && !scopeArchived

  let chats: ChatData[] = []
  let archived: ChatData[] = []

  if (scopeChats || scopeNoneSpecified) {
    chats = await searchUserChats(userId, { query: q, mentions: mentions || [] })
  }
  if (scopeArchived || scopeNoneSpecified) {
    archived = await searchUserArchivedChats(userId, { query: q, mentions: mentions || [] })
  }

  return (
    <div className="mt-4 space-y-6">
      <ChatsResultsView chats={chats} archived={archived} />
    </div>
  )
}


