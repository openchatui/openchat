"use client"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { moveFileSubmitAction } from "@/actions/files"

interface MoveFileDialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  fileId: string
}

interface FolderItem { id: string; name: string }

export function MoveFileDialog({ open, onOpenChange, fileId }: MoveFileDialogProps) {
  const [currentParent, setCurrentParent] = useState<string>("")
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(parent: string) {
    setLoading(true)
    setError(null)
    try {
      const url = parent ? `/api/folders/list?parent=${encodeURIComponent(parent)}` : `/api/folders/list`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setCurrentParent(data.parentId as string)
      setFolders((data.folders as any[])?.map((f: any) => ({ id: f.id, name: f.name })) ?? [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load("")
  }, [open])

  async function onConfirm(formData: FormData) {
    await moveFileSubmitAction(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move file</DialogTitle>
          <DialogDescription>Select a destination folder.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => load("")}>Root</Button>
          </div>
          <div className="border rounded-md max-h-64 overflow-auto">
            {loading ? (
              <div className="p-3 text-sm text-muted-foreground">Loading…</div>
            ) : folders.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No subfolders</div>
            ) : (
              <ul className="p-2 space-y-1">
                {folders.map(f => (
                  <li key={f.id} className="flex items-center justify-between">
                    <button className="text-left p-2 hover:bg-muted rounded w-full" onClick={() => load(f.id)}>{f.name}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form action={onConfirm} className="flex items-center justify-end gap-2">
            <input type="hidden" name="fileId" value={fileId} />
            <input type="hidden" name="targetParentId" value={currentParent} />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Move here</Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}


