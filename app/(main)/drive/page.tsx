import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FolderDbService } from "@/lib/server/file-management/folder-db.service";
import { FilesSearchBar } from "@/components/drive/FilesSearchBar";
import { FilesResultsTable } from "@/components/drive/FilesResultsTable";

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

  const [folders, files, breadcrumb] = await Promise.all([
    FolderDbService.listFoldersByParent(session.user.id, effectiveRootId),
    FolderDbService.listFilesByParent(session.user.id, effectiveRootId),
    FolderDbService.getFolderBreadcrumb(session.user.id, effectiveRootId),
  ])
  const entries = [...folders, ...files]

  return (
    <div className="space-y-6">
      <FilesSearchBar />
      <FilesResultsTable entries={entries} parentId={effectiveRootId} breadcrumb={breadcrumb} />
    </div>
  );
}


