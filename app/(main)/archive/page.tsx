"use server"

import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ChatStore } from "@/lib/features/chat"
import ArchiveLiveRefresher from "@/components/archive/ArchiveLiveRefresher"
import UnarchiveButton from "@/components/archive/UnarchiveButton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function ArchivePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id
  const chats = await ChatStore.getUserArchivedChats(userId)

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
    <div className="space-y-6 p-4 w-full max-w-full">
      <ArchiveLiveRefresher />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Archived Chats</h1>
      </div>
      {chats.length === 0 ? (
        <div className="text-sm text-muted-foreground">No archived chats</div>
      ) : (
        <div className="border rounded-lg overflow-hidden w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="w-48">Created</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chats.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/archive/${c.id}`} className="hover:underline">
                      {c.title || 'Untitled Chat'}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.createdAt as any)}</TableCell>
                  <TableCell className="text-right">
                    <UnarchiveButton chatId={c.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}


