import { FilesLeftSidebar } from "@/components/drive/FilesLeftSidebar"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { findLocalRootFolderId, getGoogleRootFolderId } from "@/lib/modules/drive"
import { DriveBottomNav } from "@/components/drive/DriveBottomNav"

export default async function DriveLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [localRootIdRaw, googleRootId] = await Promise.all([
    findLocalRootFolderId(session.user.id),
    getGoogleRootFolderId(session.user.id),
  ])
  const localRootId = localRootIdRaw ?? ''

  return (
    <div className="flex w-full">
      <div className="hidden md:block">
        <FilesLeftSidebar localRootId={localRootId} googleRootId={googleRootId} />
      </div>
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
      <DriveBottomNav localRootId={localRootId} />
    </div>
  )
}


