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
import { usePathname } from "next/navigation"
import { CreateFolderDialog } from "./CreateFolderDialog"
import { UploadFileDialog } from "./UploadFileDialog"
import { UploadFolderDialog } from "./UploadFolderDialog"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { FaStar, FaRegStar } from "react-icons/fa"
import Image from "next/image"
import { DriveStorageInfo } from "./DriveStorageInfo"

interface FilesLeftSidebarProps {
  parentId?: string
  localRootId: string
  googleRootId: string | null
}

export function FilesLeftSidebar({ parentId = "", localRootId, googleRootId }: FilesLeftSidebarProps) {
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showUploadFile, setShowUploadFile] = useState(false)
  const [showUploadFolder, setShowUploadFolder] = useState(false)
  const pathname = usePathname()
  const isTrash = pathname?.startsWith('/drive/trash')
  return (
    <aside className="w-64 shrink-0 border-r px-3 py-4 flex flex-col h-full">
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full justify-center" disabled={!!isTrash}>
              <Plus className="mr-2 h-4 w-4" /> New
            </Button>
          </DropdownMenuTrigger>
          {!isTrash && (
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
          )}
        </DropdownMenu>
      </div>

      <nav className="space-y-1 flex-1">
        <SidebarLink href="/drive" icon={<Home className="h-4 w-4" />} label="Home" className="my-4 mt-6"/>
        <Separator className="my-4"/>
        <SidebarLink 
          href={`/drive/folder/${localRootId}`} 
          icon={<HardDrive className="h-4 w-4" />} 
          label="Local" 
        />
        {googleRootId && (
          <SidebarLink 
            href={`/drive/folder/${googleRootId}`} 
            icon={<Image src="/logos/Google_Drive.svg" alt="Google Drive" width={16} height={16} className="h-4 w-4" />} 
            label="Google Drive" 
          />
        )}
        <SidebarLink href="/drive/shared" icon={<Users className="h-4 w-4" />} label="Shared with me" />
        <Separator className="my-4"/>
        <SidebarLink href="/drive/recent" icon={<Clock className="h-4 w-4" />} label="Recent" />
        <SidebarLink href="/drive/starred" icon={<FaRegStar className="h-4 w-4" />} label="Starred" />
        <SidebarLink href="/drive/trash" icon={<Trash2 className="h-4 w-4" />} label="Trash" />
      </nav>
      {googleRootId && <DriveStorageInfo />}
      {!isTrash && (
        <>
          <CreateFolderDialog open={showNewFolder} onOpenChange={setShowNewFolder} parent={parentId} />
          <UploadFileDialog open={showUploadFile} onOpenChange={setShowUploadFile} parent={parentId} />
          <UploadFolderDialog open={showUploadFolder} onOpenChange={setShowUploadFolder} parent={parentId} />
        </>
      )}
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


