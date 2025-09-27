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
import { MoveFolderDialog } from "./MoveFolderDialog"
import { MoveFileDialog } from "./MoveFileDialog"
import { moveFileSubmitAction, moveFolderSubmitAction } from "@/actions/files"
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, type DragOverEvent, type Modifier, useSensor, useSensors, MouseSensor, TouchSensor } from "@dnd-kit/core"
import { useDroppable, useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { snapCenterToCursor } from "@dnd-kit/modifiers"

// Using snapCenterToCursor to ensure the pill follows the pointer

interface FilesResultsTableProps {
  entries: FileEntry[]
  parentName?: string
}

export function FilesResultsTable({ entries, parentName }: FilesResultsTableProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastIndex, setLastIndex] = useState<number | null>(null)
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null)
  const [moveFileId, setMoveFileId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overFolderId, setOverFolderId] = useState<string | null>(null)
  const idToItem = useMemo(() => {
    const m = new Map<string, FileEntry>()
    for (const e of entries) m.set(e.id, e)
    return m
  }, [entries])

  // Require a small pointer movement (and press delay on touch) before starting drag
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  )

  const allIds = useMemo(() => entries.map(e => e.id), [entries])

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

    const id = item.id
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id ? String(event.over.id) : null
    if (overId && overId.startsWith('folder/')) {
      setOverFolderId(overId.slice('folder/'.length))
    } else {
      setOverFolderId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    try {
      const overId = event.over?.id ? String(event.over.id) : null
      const activeIdLocal = event.active?.id ? String(event.active.id) : null
      if (!overId || !activeIdLocal) return
      if (!overId.startsWith('folder/')) return
      const targetParentId = overId.slice('folder/'.length)
      if (!targetParentId || targetParentId === activeIdLocal) return
      const item = idToItem.get(activeIdLocal)
      if (!item) return
      const form = new FormData()
      if (item.isDirectory) {
        form.set('folderId', activeIdLocal)
        form.set('targetParentId', targetParentId)
        await moveFolderSubmitAction(form)
      } else {
        form.set('fileId', activeIdLocal)
        form.set('targetParentId', targetParentId)
        await moveFileSubmitAction(form)
      }
      router.refresh()
    } finally {
      setActiveId(null)
      setOverFolderId(null)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
    <div className="w-full min-h-[70vh]" onClick={handleBackgroundClick}>
      {selected.size > 0 && (
        <div data-selectionbar="true" className="mb-2 flex h-10 items-center gap-4 rounded-full bg-muted px-3 text-sm">
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
              <RowItem
                key={item.id}
                item={item}
                parentName={parentName}
                selected={selected}
                onRowClick={handleRowClick}
                onRowDoubleClick={handleRowDoubleClick}
                setMoveFolderId={setMoveFolderId}
                setMoveFileId={setMoveFileId}
                activeId={activeId}
                allIds={allIds}
                overFolderId={overFolderId}
              />
            ))
          )}
        </TableBody>
      </Table>
      <MoveFolderDialog open={!!moveFolderId} onOpenChange={(next) => { if (!next) setMoveFolderId(null) }} folderId={moveFolderId ?? ''} />
      <MoveFileDialog open={!!moveFileId} onOpenChange={(next) => { if (!next) setMoveFileId(null) }} fileId={moveFileId ?? ''} />
      <DragOverlay modifiers={[snapCenterToCursor]}>
        {activeId ? (() => {
          const it = idToItem.get(activeId)
          if (!it) return null
          return (
            <div className="inline-flex pointer-events-none rounded-full border bg-muted text-foreground shadow-md px-3 py-1.5 text-sm items-center gap-2 w-auto">
              {it.isDirectory ? (
                <FolderClosed className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="max-w-[320px] truncate font-medium">{it.name}</span>
            </div>
          )
        })() : null}
      </DragOverlay>
    </div>
    </DndContext>
  )
}

interface RowItemProps {
  item: FileEntry
  parentName?: string
  selected: Set<string>
  onRowClick: (e: React.MouseEvent, index: number, item: FileEntry) => void
  onRowDoubleClick: (item: FileEntry) => void
  setMoveFolderId: (id: string) => void
  setMoveFileId: (id: string) => void
  activeId: string | null
  allIds: string[]
  overFolderId: string | null
}

function RowItem({ item, parentName, selected, onRowClick, onRowDoubleClick, setMoveFolderId, setMoveFileId, activeId, allIds, overFolderId }: RowItemProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: item.id })
  const { isOver, setNodeRef: setDropRef } = item.isDirectory ? useDroppable({ id: `folder/${item.id}` }) : ({ isOver: false, setNodeRef: (_: any) => {} } as any)
  const setRowRef = (node: any) => { setNodeRef(node); if (item.isDirectory) setDropRef(node) }
  const isDragging = activeId === item.id
  const highlightDragged = isDragging && !!overFolderId
  return (
    <TableRow
      ref={setRowRef}
      onClick={(e) => onRowClick(e, allIds.indexOf(item.id), item)}
      onDoubleClick={() => onRowDoubleClick(item)}
      data-row
      className={`h-14 select-none cursor-pointer [&>td]:align-middle ${selected.has(item.id) ? 'bg-muted' : 'hover:bg-muted/50'} ${isDragging ? 'opacity-50' : ''} ${item.isDirectory && isOver ? 'ring-2 ring-primary/40' : ''} ${highlightDragged ? 'ring-2 ring-primary/50' : ''}`}
      {...listeners}
      {...attributes}
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
      <TableCell>{new Date(item.modifiedMs).toLocaleString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}</TableCell>
      <TableCell className="flex items-center justify-between">
        <span>{parentName ? `/${parentName}` : '/'}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {item.isDirectory ? (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setMoveFolderId(item.id) }}>Move folder…</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setMoveFileId(item.id) }}>Move file…</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}


