import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FolderDbService } from "@/lib/server/file-management/folder-db.service";
import { FilesSearchBar } from "@/components/files/FilesSearchBar";
import { FilesResultsTable } from "@/components/files/FilesResultsTable";
import { FilesLeftSidebar } from "@/components/files/FilesLeftSidebar";

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
    : await FolderDbService.getRootFolderId(session.user.id)

  const [folders, files] = await Promise.all([
    FolderDbService.listFoldersByParent(session.user.id, effectiveRootId),
    FolderDbService.listFilesByParent(session.user.id, effectiveRootId),
  ])
  const entries = [...folders, ...files]

  return (
    <div className="flex w-full min-h-screen">
      <FilesLeftSidebar parentId={effectiveRootId} />
      <main className="flex-1 mx-2 px-2.5 py-6 space-y-6 min-h-screen">
        <FilesSearchBar />
        <FilesResultsTable entries={entries} />
      </main>
    </div>
  );
}


