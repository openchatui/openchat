"use client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, FolderPlus, FileUp, FolderUp } from "lucide-react"

export function FilesFabMenu() {
  return (
    <div className="fixed bottom-6 right-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="h-14 w-14 rounded-full" size="icon">
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-56">
          <DropdownMenuLabel>New</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <FolderPlus className="mr-2 h-4 w-4" />
            <span>New Folder</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FileUp className="mr-2 h-4 w-4" />
            <span>File Upload</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FolderUp className="mr-2 h-4 w-4" />
            <span>Folder Upload</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}


