import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FilesSearchBar } from "@/components/drive/FilesSearchBar";
import { FilesResultsTable } from "@/components/drive/FilesResultsTable";
import { listStarredEntries } from "@/lib/server/drive";

export default async function StarredPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const entries = await listStarredEntries(session.user.id)

  return (
    <div className="space-y-6">
      <FilesSearchBar />
      <FilesResultsTable entries={entries} parentName={"Starred"} />
    </div>
  )
}


