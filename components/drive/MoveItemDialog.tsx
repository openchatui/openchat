"use client"
import { useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { moveFileSubmitAction, moveFolderSubmitAction, moveItemsSubmitAction } from "@/actions/files"
import { ArrowLeft, ChevronRight } from "lucide-react"

interface MoveItemDialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  itemId: string
  itemType: "file" | "folder"
  itemName?: string
  bulkItems?: { id: string; isDirectory: boolean; name: string }[]
}

interface FolderItem { id: string; name: string }

export function MoveItemDialog({ open, onOpenChange, itemId, itemType, itemName, bulkItems }: MoveItemDialogProps) {
  const router = useRouter()
  const [currentParent, setCurrentParent] = useState<string>("")
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentParentName, setCurrentParentName] = useState<string>("Root")
  const [crumbs, setCrumbs] = useState<{ id: string; name: string }[]>([])
  const [submitted, setSubmitted] = useState(false)

  async function load(parent: string) {
    setLoading(true)
    setError(null)
    try {
      const url = parent ? `/api/folders/list?parent=${encodeURIComponent(parent)}` : `/api/folders/list`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setCurrentParent(data.parentId as string)
      setCurrentParentName((data.parentName as string) || "Root")
      setFolders((data.folders as any[])?.map((f: any) => ({ id: f.id, name: f.name })) ?? [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      setCrumbs([])
      load("")
    }
  }, [open])

  function navigateInto(folder: FolderItem) {
    setCrumbs(prev => [...prev, { id: folder.id, name: folder.name }])
    load(folder.id)
  }

  function handleBack() {
    setCrumbs(prev => {
      if (prev.length === 0) return prev
      const next = prev.slice(0, prev.length - 1)
      const parentId = next.length > 0 ? next[next.length - 1]!.id : ""
      load(parentId)
      return next
    })
  }

  async function onConfirm(formData: FormData) {
    // Bulk move when bulkItems provided
    if (bulkItems && bulkItems.length > 0) {
      const targetParentId = String(formData.get('targetParentId') ?? '')
      const fd = new FormData()
      fd.set('targetParentId', targetParentId)
      for (const it of bulkItems) {
        if (it.isDirectory) fd.append('folderIds', it.id); else fd.append('fileIds', it.id)
      }
      await moveItemsSubmitAction(fd)
      onOpenChange(false)
      router.refresh()
      return
    }
    if (itemType === "folder") {
      await moveFolderSubmitAction(formData)
    } else {
      await moveFileSubmitAction(formData)
    }
    onOpenChange(false)
  }

  const displayName = itemName || (itemType === "folder" ? "Folder" : "File")
  const title = `Move "${displayName}"`
  const idFieldName = itemType === "folder" ? "folderId" : "fileId"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Select a destination folder.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Current location: {currentParentName || 'Root'}</div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack} disabled={crumbs.length === 0} aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              {crumbs.length > 0 && (
                <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Breadcrumb">
                  {crumbs.map((c, idx) => (
                    <div key={c.id} className="flex items-center gap-1">
                      <button
                        className={`inline-flex items-center rounded-full px-2 py-1 hover:bg-muted ${idx === crumbs.length - 1 ? 'font-semibold' : ''}`}
                        onClick={() => {
                          const targetId = c.id
                          setCrumbs(prev => prev.slice(0, idx + 1))
                          load(targetId)
                        }}
                      >
                        <span className="truncate max-w-[160px]">{c.name}</span>
                      </button>
                      {idx < crumbs.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  ))}
                </nav>
              )}
            </div>
          </div>
          <div className="rounded-md max-h-64 overflow-auto">
            {loading ? (
              <div className="p-2 text-sm text-muted-foreground">Loading…</div>
            ) : folders.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No subfolders</div>
            ) : (
              <ul className="px-1 py-1 space-y-1">
                {folders.map(f => (
                  <li key={f.id} className="flex items-center justify-between">
                    <button className="text-left px-2 py-1.5 hover:bg-muted rounded w-full" onClick={() => navigateInto(f)}>{f.name}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form action={onConfirm} className="flex items-center justify-end gap-2">
            <input type="hidden" name={idFieldName} value={itemId} />
            <input type="hidden" name="targetParentId" value={currentParent} />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Move here</Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}


