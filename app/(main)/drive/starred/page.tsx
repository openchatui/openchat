import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FilesSearchBar } from "@/components/drive/FilesSearchBar";
import { FilesResultsTable } from "@/components/drive/FilesResultsTable";
import { listStarredEntries, getRootFolderId, findLocalRootFolderId, getGoogleRootFolderId } from "@/lib/modules/drive";
import { FilesResultsTableMobile } from "@/components/drive/FilesResultsTableMobile";
import { DriveMobileHeader } from "@/components/drive/DriveMobileHeader";
import { MobileDriveFab } from "@/components/drive/MobileDriveFab";

export default async function StarredPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [entries, rootId, localRootIdRaw, googleRootId] = await Promise.all([
    listStarredEntries(session.user.id),
    getRootFolderId(session.user.id),
    findLocalRootFolderId(session.user.id),
    getGoogleRootFolderId(session.user.id),
  ])
  const localRootId = localRootIdRaw ?? ''

  return (
    <>
      {/* Mobile header: fixed search + filters */}
      <DriveMobileHeader localRootId={localRootId} googleRootId={googleRootId} isGoogleDriveFolder={false} />
      {/* Spacer to offset the fixed mobile header height */}
      <div className="md:hidden h-[136px]" />

      {/* Mobile results list (full-width, scrolls under header) */}
      <div className="md:hidden">
        <FilesResultsTableMobile entries={entries} parentName={"Starred"} />
      </div>

      {/* Mobile floating action button */}
      <MobileDriveFab parentId={rootId} />

      {/* Desktop layout */}
      <div className="hidden md:block space-y-6">
        <FilesSearchBar />
        <FilesResultsTable entries={entries} parentName={"Starred"} />
      </div>
    </>
  )
}


