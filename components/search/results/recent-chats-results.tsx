"use server"

import { ChatStore, type ChatData } from "@/lib/features/chat"
import SearchInfinite from "@/components/search/search-infinite"

interface RecentChatsResultsProps {
  userId: string
}

export default async function RecentChatsResults({ userId }: RecentChatsResultsProps) {
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


