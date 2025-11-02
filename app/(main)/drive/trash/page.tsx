import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTrashFolderId, listFoldersByParent, listFilesByParent } from "@/lib/modules/drive";
import { FilesResultsTable } from "@/components/drive/FilesResultsTable";
import { FilesSearchBar } from "@/components/drive/FilesSearchBar";
import { FilesResultsTableMobile } from "@/components/drive/FilesResultsTableMobile";
import { DriveMobileHeader } from "@/components/drive/DriveMobileHeader";

export default async function TrashPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Ensure the user's Trash system folder exists
  const trashId = await getTrashFolderId(session.user.id);

  // Load only Trash folder contents (not My Drive root)
  const [folders, files] = await Promise.all([
    listFoldersByParent(session.user.id, trashId),
    listFilesByParent(session.user.id, trashId),
  ])
  const entries = [...folders, ...files]
  const breadcrumb = [{ id: trashId, name: 'Trash' }]

  return (
    <>
      {/* Mobile header: fixed search + filters */}
      <DriveMobileHeader />
      {/* Spacer to offset the fixed mobile header height */}
      <div className="md:hidden h-[136px]" />

      {/* Mobile results list (full-width, scrolls under header) */}
      <div className="md:hidden">
        <FilesResultsTableMobile entries={entries} parentName="Trash" />
      </div>

      {/* Desktop layout */}
      <div className="hidden md:block space-y-6">
        <FilesSearchBar />
        <FilesResultsTable entries={entries} parentId={trashId} parentName="Trash" breadcrumb={breadcrumb} />
      </div>
    </>
  );
}


