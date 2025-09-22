"use client"

import { Button } from "@/components/ui/button"
import { ArchiveRestore } from "lucide-react"
import { useRouter } from "next/navigation"
import { unarchiveChatAction } from "@/actions/chat"

interface UnarchiveButtonProps {
  chatId: string
}

export default function UnarchiveButton({ chatId }: UnarchiveButtonProps) {
  const router = useRouter()

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await unarchiveChatAction(chatId)
      try {
        const bc = new BroadcastChannel('chats')
        bc.postMessage({ type: 'unarchived', id: chatId })
        bc.close()
      } catch {}
    } finally {
      router.refresh()
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={onClick} aria-label="Unarchive">
      <ArchiveRestore className="h-4 w-4" />
    </Button>
  )
}


