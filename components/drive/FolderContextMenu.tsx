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
import { Download, PencilLine, FolderOpen, FolderInput, Star, Redo, MoreVertical } from "lucide-react"
import { TrashButton } from "./TrashButton"
import { moveFolderToTrashSubmitAction } from "@/actions/files"
import { Button } from "@/components/ui/button"

interface FolderContextMenuProps {
  folderId: string
  children?: React.ReactNode
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
    try {
      const url = `/api/folders/download?id=${encodeURIComponent(folderId)}`
      const a = document.createElement('a')
      a.href = url
      a.download = ''
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {}
  }

  if (disabled) {
    return <>{children}</>
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children ? (
          children
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onMouseDown={(e) => {
              if (e.button === 0) {
                e.preventDefault()
                e.currentTarget.dispatchEvent(new window.MouseEvent('contextmenu', {
                  bubbles: true,
                  cancelable: true,
                  clientX: e.clientX,
                  clientY: e.clientY,
                }))
              }
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}
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


