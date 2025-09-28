"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Home, HardDrive, Users, Clock, Star, Trash2, Plus, FolderPlus, FileUp, FolderUp } from "lucide-react"
import Link from "next/link"
import { CreateFolderDialog } from "./CreateFolderDialog"
import { UploadFileDialog } from "./UploadFileDialog"
import { UploadFolderDialog } from "./UploadFolderDialog"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function FilesLeftSidebar({ parentId = "" }: { parentId?: string }) {
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showUploadFile, setShowUploadFile] = useState(false)
  const [showUploadFolder, setShowUploadFolder] = useState(false)
  return (
    <aside className="w-64 shrink-0 border-r px-3 py-4 space-y-4">
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full justify-center">
              <Plus className="mr-2 h-4 w-4" /> New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="w-56">
            <DropdownMenuLabel>Create</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowNewFolder(true) }}>
              <FolderPlus className="mr-2 h-4 w-4" />
              <span>New Folder</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowUploadFile(true) }}>
              <FileUp className="mr-2 h-4 w-4" />
              <span>File Upload</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowUploadFolder(true) }}>
              <FolderUp className="mr-2 h-4 w-4" />
              <span>Folder Upload</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="space-y-1">
        <SidebarLink href="/drive" icon={<Home className="h-4 w-4" />} label="Home" className="my-4 mt-6"/>
        <Separator className="my-4"/>
        <SidebarLink href="/drive" icon={<HardDrive className="h-4 w-4" />} label="My Drive" />
        <SidebarLink href="/drive/shared" icon={<Users className="h-4 w-4" />} label="Shared with me" />
        <Separator className="my-4"/>
        <SidebarLink href="/drive/recent" icon={<Clock className="h-4 w-4" />} label="Recent" />
        <SidebarLink href="/drive/starred" icon={<Star className="h-4 w-4" />} label="Starred" />
        <SidebarLink href="/drive/trash" icon={<Trash2 className="h-4 w-4" />} label="Trash" />
      </nav>
      <CreateFolderDialog open={showNewFolder} onOpenChange={setShowNewFolder} parent={parentId} />
      <UploadFileDialog open={showUploadFile} onOpenChange={setShowUploadFile} parent={parentId} />
      <UploadFolderDialog open={showUploadFolder} onOpenChange={setShowUploadFolder} parent={parentId} />
    </aside>
  )
}

function SidebarLink({ href, icon, label, className }: { href: string; icon: React.ReactNode; label: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted", className)}>
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}


