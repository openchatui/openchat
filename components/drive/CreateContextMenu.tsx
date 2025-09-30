"use client"

import { useState } from "react"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { FolderPlus, FileUp, FolderUp } from "lucide-react"
import { CreateFolderDialog } from "./CreateFolderDialog"
import { UploadFileDialog } from "./UploadFileDialog"
import { UploadFolderDialog } from "./UploadFolderDialog"

interface CreateContextMenuProps {
  parentId?: string
  children: React.ReactNode
  disabled?: boolean
}

export function CreateContextMenu({ parentId = "", children, disabled = false }: CreateContextMenuProps) {
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showUploadFile, setShowUploadFile] = useState(false)
  const [showUploadFolder, setShowUploadFolder] = useState(false)

  if (disabled) {
    return <div>{children}</div>
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={(e) => { e.preventDefault(); setShowNewFolder(true) }}>
          <FolderPlus className="mr-2 h-4 w-4" />
          <span>New Folder</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={(e) => { e.preventDefault(); setShowUploadFile(true) }}>
          <FileUp className="mr-2 h-4 w-4" />
          <span>File Upload</span>
        </ContextMenuItem>
        <ContextMenuItem onSelect={(e) => { e.preventDefault(); setShowUploadFolder(true) }}>
          <FolderUp className="mr-2 h-4 w-4" />
          <span>Folder Upload</span>
        </ContextMenuItem>
      </ContextMenuContent>

      <CreateFolderDialog open={showNewFolder} onOpenChange={setShowNewFolder} parent={parentId} />
      <UploadFileDialog open={showUploadFile} onOpenChange={setShowUploadFile} parent={parentId} />
      <UploadFolderDialog open={showUploadFolder} onOpenChange={setShowUploadFolder} parent={parentId} />
    </ContextMenu>
  )
}


