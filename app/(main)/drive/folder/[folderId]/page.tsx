import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listFoldersByParent, listFilesByParent, getFolderNameById, getFolderBreadcrumb, isGoogleDriveFolder } from "@/lib/server/drive";
import { FilesSearchBar } from "@/components/drive/FilesSearchBar";
import { FilesResultsTable } from "@/components/drive/FilesResultsTable";

interface PageProps {
  params: Promise<{ folderId: string }>
}

export default async function FolderPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { folderId } = await params

  const [folders, files, parentName, breadcrumb, isDrive] = await Promise.all([
    listFoldersByParent(session.user.id, folderId),
    listFilesByParent(session.user.id, folderId),
    getFolderNameById(session.user.id, folderId),
    getFolderBreadcrumb(session.user.id, folderId),
    isGoogleDriveFolder(session.user.id, folderId),
  ])
  const entries = [...folders, ...files]

  return (
    <div className="space-y-6">
      <FilesSearchBar />
      <FilesResultsTable entries={entries} parentName={parentName ?? undefined} parentId={folderId} breadcrumb={breadcrumb} isGoogleDriveFolder={isDrive} />
    </div>
  );
}


