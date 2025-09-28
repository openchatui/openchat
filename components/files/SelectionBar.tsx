"use client"

import { X, UserPlus, Download, FolderOpen, Trash2, Link as LinkIcon, MoreVertical } from "lucide-react"

interface SelectionBarProps {
  count: number
  onClear: () => void
}

export function SelectionBar({ count, onClear }: SelectionBarProps) {
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
        <button className="rounded p-1 hover:bg-background/60" aria-label="Download"><Download className="h-4 w-4" /></button>
        <button className="rounded p-1 hover:bg-background/60" aria-label="Move"><FolderOpen className="h-4 w-4" /></button>
        <button className="rounded p-1 hover:bg-background/60" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
        <button className="rounded p-1 hover:bg-background/60" aria-label="Get link"><LinkIcon className="h-4 w-4" /></button>
        <button className="rounded p-1 hover:bg-background/60" aria-label="More"><MoreVertical className="h-4 w-4" /></button>
      </div>
    </div>
  )
}


