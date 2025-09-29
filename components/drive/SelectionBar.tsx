"use client"

import { X, UserPlus, Download, FolderOpen, Link as LinkIcon, MoreVertical, Undo2 } from "lucide-react"
import { TrashButton } from "@/components/drive/TrashButton"
import { FolderContextMenu } from "@/components/drive/FolderContextMenu"

interface SelectionBarProps {
  count: number
  onClear: () => void
  onTrashSelected?: () => void | Promise<void>
  onDownloadSelected?: () => void | Promise<void>
  onMoveSelected?: () => void | Promise<void>
  contextFolderId?: string
  contextMenuDisabled?: boolean
  onRestoreSelected?: () => void | Promise<void>
}

export function SelectionBar({ count, onClear, onTrashSelected, onDownloadSelected, onMoveSelected, contextFolderId, contextMenuDisabled, onRestoreSelected }: SelectionBarProps) {
  return (
    <div data-selectionbar="true" className="mb-2 flex h-10 items-center gap-4 rounded-full bg-muted px-3 text-sm">
      <div className="flex items-center gap-2">
        <button aria-label="Clear selection" onClick={onClear} className="rounded-full p-1 hover:bg-background/60">
          <X className="h-4 w-4" />
        </button>
        <span className="font-medium">{count} selected</span>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <button className="rounded p-1 hover:bg-background/60" aria-label="Share"><UserPlus className="h-4 w-4" /></button>
        <button className="rounded p-1 hover:bg-background/60" aria-label="Download" onClick={() => onDownloadSelected?.()}><Download className="h-4 w-4" /></button>
        <button className="rounded p-1 hover:bg-background/60" aria-label="Move" onClick={() => onMoveSelected?.()}><FolderOpen className="h-4 w-4" /></button>
        <TrashButton onConfirm={() => onTrashSelected?.()} showLabel={false} />
        {onRestoreSelected && (
          <button className="rounded p-1 hover:bg-background/60" aria-label="Restore" onClick={() => onRestoreSelected?.()}><Undo2 className="h-4 w-4" /></button>
        )}
        <button className="rounded p-1 hover:bg-background/60" aria-label="Get link"><LinkIcon className="h-4 w-4" /></button>
        {contextFolderId ? (
          <FolderContextMenu folderId={contextFolderId} onMove={() => onMoveSelected?.()} onDownload={() => onDownloadSelected?.()} disabled={!!contextMenuDisabled} />
        ) : (
          <button className="rounded p-1 hover:bg-background/60" aria-label="More">
            <MoreVertical className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}


