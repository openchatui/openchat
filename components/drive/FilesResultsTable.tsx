"use client"
import type { FileEntry } from "@/lib/server/file-management"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FolderClosed, FileText, Image, Table2, MoreVertical } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FolderContextMenu } from "./FolderContextMenu"
const SelectionBar = dynamic(() => import("./SelectionBar").then(m => m.SelectionBar), { loading: () => <div className="mb-2 h-10" /> })
const FiltersBar = dynamic(() => import("./FiltersBar").then(m => m.FiltersBar), { loading: () => <div className="mb-2 h-10" /> })
const MoveItemDialog = dynamic(() => import("./MoveItemDialog").then(m => m.MoveItemDialog))
import { moveFileSubmitAction, moveFolderSubmitAction, restoreFolderFromTrashSubmitAction } from "@/actions/files"
import { Breadcrumbs } from "./Breadcrumbs"
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, type DragOverEvent, type Modifier, useSensor, useSensors, MouseSensor, TouchSensor, pointerWithin } from "@dnd-kit/core"
import { useDroppable, useDraggable } from "@dnd-kit/core"
import { snapCenterToCursor } from "@dnd-kit/modifiers"
import { CreateContextMenu } from "./CreateContextMenu"
import PreviewDialog from "./PreviewDialog"

// Using snapCenterToCursor to ensure the pill follows the pointer

interface FilesResultsTableProps {
  entries: FileEntry[]
  parentName?: string
  parentId?: string
  breadcrumb?: { id: string; name: string }[]
}

function getIconForFile(name: string) {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  if ([
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'avif'
  ].includes(ext)) {
    return <Image className="h-4 w-4" />
  }
  if (ext === 'pdf') {
    return <FileText className="h-4 w-4" />
  }
  if ([
    'xls', 'xlsx', 'xlsm', 'csv', 'tsv', 'ods', 'numbers'
  ].includes(ext)) {
    return <Table2 className="h-4 w-4" />
  }
  if ([
    'doc', 'docx', 'rtf', 'odt'
  ].includes(ext)) {
    return <FileText className="h-4 w-4" />
  }
  return <FileText className="h-4 w-4" />
}

function isPreviewable(name: string) {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  if ([
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'avif',
    'pdf'
  ].includes(ext)) return true
  return false
}

function isImageName(name: string) {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  return [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'avif'
  ].includes(ext)
}

export function FilesResultsTable({ entries, parentName, parentId, breadcrumb }: FilesResultsTableProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [lastIndex, setLastIndex] = useState<number | null>(null)
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null)
  const [moveFileId, setMoveFileId] = useState<string | null>(null)
  const [restoreFolderId, setRestoreFolderId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overFolderId, setOverFolderId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null)
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
      if (parentName === 'Trash') {
        setRestoreFolderId(item.id)
        return
      }
      router.push(`/drive/folder/${encodeURIComponent(item.path)}`)
      return
    }
    const url = isImageName(item.name)
      ? `/images/${encodeURIComponent(item.name)}`
      : `/files/${encodeURIComponent(item.name)}`
    setPreview({ name: item.name, url })
  }, [router, setPreview])

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
      let overId = event.over?.id ? String(event.over.id) : null
      const activeIdLocal = event.active?.id ? String(event.active.id) : null
      // Fallback: sometimes over can be null at drop time with overlays; use last hovered folder
      if (!overId && overFolderId) {
        overId = `folder/${overFolderId}`
      }
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
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
    <CreateContextMenu parentId={parentId ?? ''} disabled={parentName === 'Trash'}>
    <div className="w-full min-h-[70vh]" onClick={handleBackgroundClick}>
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="mb-2 min-w-0">
          <Breadcrumbs segments={breadcrumb} />
        </div>
      )}
      {selected.size > 0 ? (
        <SelectionBar count={selected.size} onClear={() => { setSelected(new Set()); }} />
      ) : (
        <FiltersBar />
      )}
      <Table onClick={handleTableClick} className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Name</TableHead>
            <TableHead className="w-[10%]">Owner</TableHead>
            <TableHead className="w-[10%]">Last Modified</TableHead>
            <TableHead className="w-[20%]">Location</TableHead>
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
                onPreview={(it) => {
                  const url = isImageName(it.name)
                    ? `/images/${encodeURIComponent(it.name)}`
                    : `/files/${encodeURIComponent(it.name)}`
                  setPreview({ name: it.name, url })
                }}
              />
            ))
          )}
        </TableBody>
      </Table>
      <AlertDialog open={!!restoreFolderId} onOpenChange={(next) => { if (!next) setRestoreFolderId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This folder will be moved out of Trash. You will be redirected to it after restore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={restoreFolderFromTrashSubmitAction} method="post">
              <input type="hidden" name="folderId" value={restoreFolderId ?? ''} />
              <Button type="submit">Restore</Button>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MoveItemDialog
        open={!!moveFolderId}
        onOpenChange={(next) => { if (!next) setMoveFolderId(null) }}
        itemId={moveFolderId ?? ''}
        itemType="folder"
        itemName={moveFolderId ? (idToItem.get(moveFolderId)?.name ?? '') : ''}
      />
      <MoveItemDialog
        open={!!moveFileId}
        onOpenChange={(next) => { if (!next) setMoveFileId(null) }}
        itemId={moveFileId ?? ''}
        itemType="file"
        itemName={moveFileId ? (idToItem.get(moveFileId)?.name ?? '') : ''}
      />
      <DragOverlay modifiers={[snapCenterToCursor]}>
        {activeId ? (() => {
          const it = idToItem.get(activeId)
          if (!it) return null
          return (
            <div className="inline-flex pointer-events-none rounded-full border bg-muted text-foreground shadow-md px-3 py-1.5 text-sm items-center gap-2 w-auto">
              {it.isDirectory ? (
                <FolderClosed className="h-4 w-4" />
              ) : (
                getIconForFile(it.name)
              )}
              <span className="max-w-[320px] truncate font-medium">{it.name}</span>
            </div>
          )
        })() : null}
      </DragOverlay>
      <PreviewDialog
        open={!!preview}
        onOpenChange={(next) => { if (!next) setPreview(null) }}
        name={preview?.name ?? ''}
        url={preview?.url ?? ''}
      />
    </div>
    </CreateContextMenu>
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
  onPreview: (item: FileEntry) => void
}

function RowItem({ item, parentName, selected, onRowClick, onRowDoubleClick, setMoveFolderId, setMoveFileId, activeId, allIds, overFolderId, onPreview }: RowItemProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: item.id })
  const { isOver, setNodeRef: setDropRef } = item.isDirectory ? useDroppable({ id: `folder/${item.id}` }) : ({ isOver: false, setNodeRef: (_: any) => {} } as any)
  const setRowRef = (node: any) => { setNodeRef(node); if (item.isDirectory) setDropRef(node) }
  const isDragging = activeId === item.id
  const highlightDragged = isDragging && !!overFolderId
  const row = (
    <TableRow
      ref={setRowRef}
      onClick={(e) => onRowClick(e, allIds.indexOf(item.id), item)}
      onDoubleClick={() => onRowDoubleClick(item)}
      data-row
      className={`h-14 select-none cursor-pointer [&>td]:align-middle ${selected.has(item.id) ? 'bg-muted' : 'hover:bg-muted/50'} ${isDragging ? 'opacity-50' : ''} ${item.isDirectory && isOver ? 'ring-2 ring-primary/40' : ''} ${highlightDragged ? 'ring-2 ring-primary/50' : ''}`}
      {...listeners}
      {...attributes}
    >
      <TableCell className="flex items-center gap-2 mt-2 min-w-0">
        {item.isDirectory ? (
          <FolderClosed className="h-4 w-4" />
        ) : (
          getIconForFile(item.name)
        )}
        <span className="truncate flex-1 min-w-0">{item.name}</span>
      </TableCell>
      <TableCell>You</TableCell>
      <TableCell>{new Date(item.modifiedMs).toLocaleString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}</TableCell>
      <TableCell className="flex items-center justify-between gap-2 min-w-0">
        <span className="flex-1 min-w-0 truncate">{parentName ? `/${parentName}` : '/'}</span>
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
              <>
                {isPreviewable(item.name) && (
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onPreview(item) }}>Preview…</DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setMoveFileId(item.id) }}>Move file…</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )

  if (!item.isDirectory) return row
  const isTrashFolder = item.name.toLowerCase() === 'trash'
  return (
    <FolderContextMenu
      folderId={item.id}
      onMove={() => setMoveFolderId(item.id)}
      disabled={isTrashFolder}
    >
      {row}
    </FolderContextMenu>
  )
}


