"use client"

import { Button } from "@/components/ui/button"
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem } from "@/components/ui/menubar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { FileText, Star, FolderClosed, Cloud } from "lucide-react"

interface DocsChromeProps {
  title: string
  onRename?: (title: string) => void
  className?: string
}

export function DocsChrome({ title, onRename, className }: DocsChromeProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [localTitle, setLocalTitle] = useState(title)
  const [starred, setStarred] = useState(false)

  const commitRename = () => {
    setIsEditing(false)
    if (localTitle !== title) onRename?.(localTitle)
  }

  return (
    <div className={cn("z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="mr-16 flex max-w-7xl items-stretch gap-3 px-3 py-1">
        {/* Left: Logo */}
        <div className="flex items-center">
          <div className="h-12 w-8 rounded-sm bg-primary text-primary-foreground flex items-center justify-center">
            <FileText className="size-5" />
          </div>
        </div>

        {/* Middle: Title + icons (top) and Menubar (bottom) */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-center gap-2 min-w-0">
            {isEditing ? (
              <Input
                autoFocus
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') { setIsEditing(false); setLocalTitle(title) }
                }}
                className="h-8 w-56 sm:w-72"
              />
            ) : (
              <button
                type="button"
                className="truncate text-sm font-medium leading-none outline-none hover:underline"
                onClick={() => setIsEditing(true)}
              >
                {localTitle}
              </button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setStarred((s) => !s)}
              aria-label={starred ? 'Unstar' : 'Star'}
            >
              <Star className={cn("size-4", starred && "fill-yellow-400 text-yellow-400")} />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Move to folder">
              <FolderClosed className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Saved to cloud">
              <Cloud className="size-4" />
            </Button>
          </div>
          <div className="mt-1">
            <Menubar className="h-9 bg-transparent border-none shadow-none rounded-none p-0">
              {['File','Edit','View','Insert','Format','Tools','Extensions','Help'].map((menu) => (
                <MenubarMenu key={menu}>
                  <MenubarTrigger className="h-9 px-3 rounded-none bg-transparent hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm">
                    {menu}
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Coming soon</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              ))}
            </Menubar>
          </div>
        </div>

        {/* Right: Share */}
        <div className="ml-auto flex items-center">
          <Button size="sm">Share</Button>
        </div>
      </div>
    </div>
  )
}

export default DocsChrome


