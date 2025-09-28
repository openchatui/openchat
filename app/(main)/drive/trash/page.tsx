import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FolderDbService } from "@/lib/server/file-management/folder-db.service";
import { FilesResultsTable } from "@/components/drive/FilesResultsTable";

export default async function TrashPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Ensure the user's Trash system folder exists
  const trashId = await FolderDbService.getTrashFolderId(session.user.id);

  // Load only Trash folder contents (not My Drive root)
  const [folders, files] = await Promise.all([
    FolderDbService.listFoldersByParent(session.user.id, trashId),
    FolderDbService.listFilesByParent(session.user.id, trashId),
  ])
  const entries = [...folders, ...files]
  const breadcrumb = [{ id: trashId, name: 'Trash' }]

  return (
    <FilesResultsTable entries={entries} parentId={trashId} parentName="Trash" breadcrumb={breadcrumb} />
  );
}


