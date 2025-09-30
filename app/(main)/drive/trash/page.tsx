import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTrashFolderId, listFoldersByParent, listFilesByParent } from "@/lib/server/drive";
import { FilesResultsTable } from "@/components/drive/FilesResultsTable";
import { FilesSearchBar } from "@/components/drive/FilesSearchBar";

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
    <div className="space-y-6">
      <FilesSearchBar />
      <FilesResultsTable entries={entries} parentId={trashId} parentName="Trash" breadcrumb={breadcrumb} />
    </div>
  );
}


