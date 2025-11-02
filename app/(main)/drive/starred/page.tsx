import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FilesSearchBar } from "@/components/drive/FilesSearchBar";
import { FilesResultsTable } from "@/components/drive/FilesResultsTable";
import { listStarredEntries, getRootFolderId } from "@/lib/modules/drive";
import { FilesResultsTableMobile } from "@/components/drive/FilesResultsTableMobile";
import { DriveMobileHeader } from "@/components/drive/DriveMobileHeader";
import { MobileDriveFab } from "@/components/drive/MobileDriveFab";

export default async function StarredPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const entries = await listStarredEntries(session.user.id)
  const rootId = await getRootFolderId(session.user.id)

  return (
    <>
      {/* Mobile header: fixed search + filters */}
      <DriveMobileHeader />
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


