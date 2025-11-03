import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listFoldersByParent, listFilesByParent, getFolderNameById, getFolderBreadcrumb, isGoogleDriveFolder, findLocalRootFolderId, getGoogleRootFolderId } from "@/lib/modules/drive";
import { FilesSearchBar } from "@/components/drive/FilesSearchBar";
import { FilesResultsTable } from "@/components/drive/FilesResultsTable";
import { FilesResultsTableMobile } from "@/components/drive/FilesResultsTableMobile";
import { DriveMobileHeader } from "@/components/drive/DriveMobileHeader";
import { MobileDriveFab } from "@/components/drive/MobileDriveFab";

interface PageProps {
  params: Promise<{ folderId: string }>
}

export default async function FolderPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { folderId } = await params

  const [folders, files, parentName, breadcrumb, isDrive, localRootIdRaw, googleRootId] = await Promise.all([
    listFoldersByParent(session.user.id, folderId),
    listFilesByParent(session.user.id, folderId),
    getFolderNameById(session.user.id, folderId),
    getFolderBreadcrumb(session.user.id, folderId),
    isGoogleDriveFolder(session.user.id, folderId),
    findLocalRootFolderId(session.user.id),
    getGoogleRootFolderId(session.user.id),
  ])
  const entries = [...folders, ...files]
  const localRootId = localRootIdRaw ?? ''

  return (
    <>
      {/* Mobile header: fixed search + filters */}
      <DriveMobileHeader localRootId={localRootId} googleRootId={googleRootId} isGoogleDriveFolder={isDrive} />
      {/* Spacer to offset the fixed mobile header height */}
      <div className="md:hidden h-[136px]" />

      {/* Mobile results list (full-width, scrolls under header) */}
      <div className="md:hidden">
        <FilesResultsTableMobile entries={entries} parentName={parentName ?? undefined} />
      </div>

      {/* Mobile floating action button */}
      <MobileDriveFab parentId={folderId} />

      {/* Desktop layout */}
      <div className="hidden md:block space-y-6">
        <FilesSearchBar />
        <FilesResultsTable
          entries={entries}
          parentName={parentName ?? undefined}
          parentId={folderId}
          breadcrumb={breadcrumb}
          isGoogleDriveFolder={isDrive}
        />
      </div>
    </>
  );
}


