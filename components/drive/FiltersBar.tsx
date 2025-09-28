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

export function FiltersBar() {
  return (
    <div className="mb-2 flex h-10 items-center gap-3 text-sm">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-8 rounded-full px-3">Type</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Type</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Folder</DropdownMenuItem>
          <DropdownMenuItem>File</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-8 rounded-full px-3">Modified</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Modified</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Today</DropdownMenuItem>
          <DropdownMenuItem>Last 7 days</DropdownMenuItem>
          <DropdownMenuItem>This year</DropdownMenuItem>
          <DropdownMenuItem>Last year</DropdownMenuItem>
          <DropdownMenuItem>Custom date range…</DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="flex items-center justify-between gap-2 p-2">
            <Button variant="ghost" size="sm">Clear all</Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">Cancel</Button>
              <Button size="sm">Apply</Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}


