"use client"
import type { FileEntry } from "@/lib/server/file-management"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FolderClosed, FileText } from "lucide-react"
import { X, UserPlus, Download, FolderOpen, Trash2, Link as LinkIcon, MoreVertical } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FilesResultsTableProps {
  entries: FileEntry[]
  parentName?: string
}

export function FilesResultsTable({ entries, parentName }: FilesResultsTableProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastIndex, setLastIndex] = useState<number | null>(null)

  const allIds = useMemo(() => entries.map(e => e.path), [entries])

  const handleRowDoubleClick = useCallback((item: FileEntry) => {
    if (item.isDirectory) {
      router.push(`/drive/folder/${encodeURIComponent(item.path)}`)
    } else {
      router.push(`/drive/${encodeURIComponent(item.path)}`)
    }
  }, [router])

  const handleRowClick = useCallback((e: React.MouseEvent, index: number, item: FileEntry) => {
    // Ignore if this is part of a double-click
    if (e.detail && e.detail > 1) return

    const id = item.path
    const isRange = e.shiftKey
    const isToggle = e.metaKey || e.ctrlKey

    setSelected(prev => {
      if (isRange && lastIndex !== null) {
        const start = Math.min(lastIndex, index)
        const end = Math.max(lastIndex, index)
        const rangeIds = new Set(allIds.slice(start, end + 1))
        return rangeIds
      }
      const next = new Set(prev)
      if (isToggle) {
        if (next.has(id)) next.delete(id); else next.add(id)
        return next
      }
      // Single selection
      return new Set([id])
    })
    setLastIndex(index)
  }, [allIds, lastIndex])

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('tr[data-row]')) return
    if (target.closest('[data-selectionbar="true"]')) return
    setSelected(new Set())
    setLastIndex(null)
  }, [])

  const handleTableClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('tr[data-row]')) return
    setSelected(new Set())
    setLastIndex(null)
  }, [])

  return (
    <div className="w-full min-h-[70vh]" onClick={handleBackgroundClick}>
      {selected.size > 0 && (
        <div data-selectionbar="true" className="mb-2 flex items-center gap-4 rounded-full bg-muted px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <button aria-label="Clear selection" onClick={() => setSelected(new Set())} className="rounded-full p-1 hover:bg-background/60">
              <X className="h-4 w-4" />
            </button>
            <span className="font-medium">{selected.size} selected</span>
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
      )}
      {selected.size === 0 && (
        <div className="mb-2 flex items-center gap-3 text-sm">
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
      )}
      <Table onClick={handleTableClick}>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead>Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">No results</TableCell>
            </TableRow>
          ) : (
            entries.map((item) => (
              <TableRow
                key={item.path}
                onClick={(e) => handleRowClick(e, allIds.indexOf(item.path), item)}
                onDoubleClick={() => handleRowDoubleClick(item)}
                onMouseDown={(e) => { e.preventDefault() }}
                data-row
                className={`h-14 select-none cursor-pointer [&>td]:align-middle ${selected.has(item.path) ? 'bg-muted' : 'hover:bg-muted/50'}`}
              >
                <TableCell className="flex items-center gap-2 mt-2">
                  {item.isDirectory ? (
                    <FolderClosed className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span>{item.name}</span>
                </TableCell>
                <TableCell>You</TableCell>
                <TableCell>{new Date(item.modifiedMs).toLocaleString()}</TableCell>
                <TableCell>{parentName ? `/${parentName}` : '/'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}


