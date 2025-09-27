import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { FolderDbService } from '@/lib/server/file-management/folder-db.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const parent = searchParams.get('parent') || ''

  try {
    const effectiveParentId = parent && parent.length > 0
      ? parent
      : await FolderDbService.getRootFolderId(session.user.id)

    const entries = await FolderDbService.listFoldersByParent(session.user.id, effectiveParentId)
    // Transform to id/name pairs from FileEntry
    const folders = entries.map(e => ({ id: e.path, name: e.name }))
    return NextResponse.json({ parentId: effectiveParentId, folders })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list folders' }, { status: 500 })
  }
}


