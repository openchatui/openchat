"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus } from "lucide-react"
import { FilesFabMenuItems } from "./FilesFabMenu"
import { CreateFolderDialog } from "./CreateFolderDialog"
import { UploadFileDialog } from "./UploadFileDialog"
import { UploadFolderDialog } from "./UploadFolderDialog"

export function MobileDriveFab({ parentId, isTrash = false }: { parentId: string; isTrash?: boolean }) {
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showUploadFile, setShowUploadFile] = useState(false)
  const [showUploadFolder, setShowUploadFolder] = useState(false)

  if (isTrash) return null

  return (
    <div className="md:hidden fixed right-6 bottom-24 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-12 w-12 rounded-full" size="icon" aria-label="Create or upload">
            <Plus className="h-8 w-8" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-56">
          <FilesFabMenuItems
            onCreateFolder={() => setShowNewFolder(true)}
            onUploadFile={() => setShowUploadFile(true)}
            onUploadFolder={() => setShowUploadFolder(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateFolderDialog open={showNewFolder} onOpenChange={setShowNewFolder} parent={parentId} />
      <UploadFileDialog open={showUploadFile} onOpenChange={setShowUploadFile} parent={parentId} />
      <UploadFolderDialog open={showUploadFolder} onOpenChange={setShowUploadFolder} parent={parentId} />
    </div>
  )
}


