import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRootFolderId, listFoldersByParent, listFilesByParent, getFolderBreadcrumb, isGoogleDriveFolder } from "@/lib/modules/drive";
import { FilesSearchBar } from "@/components/drive/FilesSearchBar";
import { FilesResultsTable } from "@/components/drive/FilesResultsTable";
import { FilesResultsTableMobile } from "@/components/drive/FilesResultsTableMobile";
import { DriveMobileHeader } from "@/components/drive/DriveMobileHeader";
import { MobileDriveFab } from "@/components/drive/MobileDriveFab";

interface FilesPageProps {
  searchParams?: Promise<{ parentId?: string | string[] }>
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp = (await searchParams) ?? {}
  const rawParent = sp.parentId
  const parentId = typeof rawParent === 'string' ? rawParent : Array.isArray(rawParent) ? (rawParent[0] ?? '') : ''

  const effectiveRootId = parentId && parentId.length > 0
    ? parentId
    : await getRootFolderId(session.user.id)

  const [folders, files, breadcrumb, isDrive] = await Promise.all([
    listFoldersByParent(session.user.id, effectiveRootId),
    listFilesByParent(session.user.id, effectiveRootId),
    getFolderBreadcrumb(session.user.id, effectiveRootId),
    isGoogleDriveFolder(session.user.id, effectiveRootId),
  ])
  const entries = [...folders, ...files]

  return (
    <>
      {/* Mobile header: fixed search + filters */}
      <DriveMobileHeader />
      {/* Spacer to offset the fixed mobile header height */}
      <div className="md:hidden h-[136px]" />

      {/* Mobile results list (full-width, scrolls under header) */}
      <div className="md:hidden">
        <FilesResultsTableMobile entries={entries} parentName={breadcrumb?.[breadcrumb.length - 1]?.name} />
      </div>

      {/* Mobile floating action button */}
      <MobileDriveFab parentId={effectiveRootId} />

      {/* Desktop layout */}
      <div className="hidden md:block space-y-6">
        <FilesSearchBar />
        <FilesResultsTable entries={entries} parentId={effectiveRootId} breadcrumb={breadcrumb} isGoogleDriveFolder={isDrive} />
      </div>
    </>
  );
}


