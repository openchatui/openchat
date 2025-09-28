"use client"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu"
import { Download, PencilLine, FolderOpen, FolderInput, Star, Redo } from "lucide-react"
import { TrashButton } from "./TrashButton"
import { moveFolderToTrashSubmitAction } from "@/actions/files"

interface FolderContextMenuProps {
  folderId: string
  children: React.ReactNode
  onMove: () => void
  onDownload?: () => void
  onRename?: () => void
  onTrash?: () => void
  onAddShortcut?: () => void
  onAddStarred?: () => void
  disabled?: boolean
}

export function FolderContextMenu({ folderId, children, onMove, onDownload, onRename, onTrash, onAddShortcut, onAddStarred, disabled = false }: FolderContextMenuProps) {
  function handleDownload() {
    if (onDownload) return onDownload()
    try { window.open(`/api/folders/download?id=${encodeURIComponent(folderId)}`, '_blank') } catch {}
  }

  if (disabled) {
    return <>{children}</>
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={(e) => { e.preventDefault(); handleDownload() }}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </ContextMenuItem>
        <ContextMenuItem onSelect={(e) => { e.preventDefault(); onRename?.() }}>
          <PencilLine className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderOpen className="mr-2 h-4 w-4" />
            Organize
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onSelect={(e) => { e.preventDefault(); onMove() }}>
              <FolderInput className="mr-2 h-4 w-4" />
              Move
            </ContextMenuItem>
            <ContextMenuItem onSelect={(e) => { e.preventDefault(); onAddShortcut?.() }}>
              <Redo className="mr-2 h-4 w-4" />
              Add shortcut
            </ContextMenuItem>
            <ContextMenuItem onSelect={(e) => { e.preventDefault(); onAddStarred?.() }}>
              <Star className="mr-2 h-4 w-4" />
              Add to starred
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <TrashButton asMenuItem formAction={moveFolderToTrashSubmitAction} hiddenFields={{ folderId }} />
      </ContextMenuContent>
    </ContextMenu>
  )
}


