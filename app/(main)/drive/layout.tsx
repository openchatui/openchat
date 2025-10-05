import { FilesLeftSidebar } from "@/components/drive/FilesLeftSidebar"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getRootFolderId, getGoogleRootFolderId } from "@/lib/server/drive"

export default async function DriveLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [localRootId, googleRootId] = await Promise.all([
    getRootFolderId(session.user.id),
    getGoogleRootFolderId(session.user.id),
  ])

  return (
    <div className="flex w-full">
      <FilesLeftSidebar localRootId={localRootId} googleRootId={googleRootId} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}


