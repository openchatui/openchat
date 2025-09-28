import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FolderDbService } from "@/lib/server/file-management/folder-db.service";
import { FilesSearchBar } from "@/components/files/FilesSearchBar";
import { FilesResultsTable } from "@/components/files/FilesResultsTable";
import { FilesLeftSidebar } from "@/components/files/FilesLeftSidebar";

interface PageProps {
  params: Promise<{ folderId: string }>
}

export default async function FolderPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { folderId } = await params

  const [folders, files, parentName, breadcrumb] = await Promise.all([
    FolderDbService.listFoldersByParent(session.user.id, folderId),
    FolderDbService.listFilesByParent(session.user.id, folderId),
    FolderDbService.getFolderNameById(session.user.id, folderId),
    FolderDbService.getFolderBreadcrumb(session.user.id, folderId),
  ])
  const entries = [...folders, ...files]

  return (
    <div className="flex w-full">
      <FilesLeftSidebar parentId={folderId} />
      <main className="flex-1 mx-2 px-2.5 py-6 space-y-6">
        <FilesSearchBar />
        <FilesResultsTable entries={entries} parentName={parentName ?? undefined} parentId={folderId} breadcrumb={breadcrumb} />
      </main>
    </div>
  );
}


