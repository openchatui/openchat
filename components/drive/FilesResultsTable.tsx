"use client"
import type { FileEntry } from "@/lib/server/drive"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Download, Pencil } from "lucide-react"
import { FaStar, FaRegStar } from "react-icons/fa";
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
import { FaFilePdf, FaImage, FaFolder } from "react-icons/fa";
import { BsFileEarmarkSpreadsheetFill } from "react-icons/bs";
import { FaFilm } from "react-icons/fa6";
import { ItemContextMenu } from "./ItemContextMenu"
const SelectionBar = dynamic(() => import("./SelectionBar").then(m => m.SelectionBar), { loading: () => <div className="mb-2 h-10" /> })
const FiltersBar = dynamic(() => import("./FiltersBar").then(m => m.FiltersBar), { loading: () => <div className="mb-2 h-10" /> })
const MoveItemDialog = dynamic(() => import("./MoveItemDialog").then(m => m.MoveItemDialog))
const RenameItemDialog = dynamic(() => import("./RenameItemDialog").then(m => m.RenameItemDialog))
import { moveFileSubmitAction, moveFolderSubmitAction, restoreFolderFromTrashSubmitAction, moveFolderToTrashSubmitAction, moveFileToTrashSubmitAction, restoreFileFromTrashSubmitAction, moveItemsSubmitAction, setFileStarredSubmitAction, setFolderStarredSubmitAction } from "@/actions/files"
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
    return <FaImage className="h-4 w-4 text-red-400" />
  }
  if ([
    'mp4', 'webm', 'ogg', 'ogv', 'mov', 'm4v', 'mkv'
  ].includes(ext)) {
    return <FaFilm className="h-4 w-4 text-red-400" />
  }
  if (ext === 'pdf') {
    return <FaFilePdf  className="text-red-400"/>
  }
  if ([
    'xls', 'xlsx', 'xlsm', 'csv', 'tsv', 'ods', 'numbers'
  ].includes(ext)) {
    return <BsFileEarmarkSpreadsheetFill className="h-4 w-4 text-green-400" />
  }
  if ([
    'doc', 'docx', 'rtf', 'odt'
  ].includes(ext)) {
    return <FileText className="h-4 w-4 text-blue-400" />
  }
  return <FileText className="h-4 w-4 text-blue-400" />
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
  const [moveBulkOpen, setMoveBulkOpen] = useState<boolean>(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overFolderId, setOverFolderId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null)
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null)
  const [renameFileId, setRenameFileId] = useState<string | null>(null)
  // Optimistic star overrides for instant UI feedback
  const [starredOverrides, setStarredOverrides] = useState<Map<string, boolean>>(new Map())
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
    // Build file URL using the stored path if present
    let rel = item.path || item.name
    if (rel.startsWith('/data/files/')) {
      rel = rel.slice('/data/files/'.length)
    } else if (rel.startsWith('data/files/')) {
      rel = rel.slice('data/files/'.length)
    }
    const url = isImageName(item.name)
      ? `/images/${encodeURIComponent(item.name)}`
      : `/files/${rel.split('/').map(encodeURIComponent).join('/')}`
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
    if (target.closest('[role="dialog"]')) return
    setSelected(new Set())
    setLastIndex(null)
  }, [])

  const handleTableClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('tr[data-row]')) return
    if (target.closest('[role="dialog"]')) return
    setSelected(new Set())
    setLastIndex(null)
  }, [])

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    setActiveId(id)
    // If the dragged item isn't in the current selection, select it
    setSelected(prev => (prev.has(id) ? prev : new Set([id])))
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
      if (!targetParentId) return
      // Determine items to move: if the active is part of selection, move all selected; otherwise move only active
      const idsToMove: string[] = (selected.size > 1 && selected.has(activeIdLocal))
        ? Array.from(selected)
        : [activeIdLocal]
      // Separate into folders and files, skip moving an item into itself
      const folderIds: string[] = []
      const fileIds: string[] = []
      for (const id of idsToMove) {
        if (id === targetParentId) continue
        const it = idToItem.get(id)
        if (!it) continue
        if (it.isDirectory) folderIds.push(id); else fileIds.push(id)
      }
      if (folderIds.length === 0 && fileIds.length === 0) return
      const form = new FormData()
      form.set('targetParentId', targetParentId)
      for (const id of folderIds) form.append('folderIds', id)
      for (const id of fileIds) form.append('fileIds', id)
      await moveItemsSubmitAction(form)
      router.refresh()
    } finally {
      setActiveId(null)
      setOverFolderId(null)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
    <CreateContextMenu parentId={parentId ?? ''} disabled={parentName === 'Trash'}>
    <div className="w-full flex flex-col border p-4 rounded-2xl h-[90vh]" onClick={handleBackgroundClick}>
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="mb-2 min-w-0">
          <Breadcrumbs segments={breadcrumb} />
        </div>
      )}
      {selected.size > 0 ? (
        <SelectionBar
          count={selected.size}
          onClear={() => { setSelected(new Set()); }}
          onDownloadSelected={() => {
            const ids = Array.from(selected)
            for (const id of ids) {
              const it = idToItem.get(id)
              if (!it) continue
              try {
                const a = document.createElement('a')
                if (it.isDirectory) {
                  a.href = `/api/folders/download?id=${encodeURIComponent(it.id)}`
                  a.download = ''
                } else {
                  a.href = `/files/${encodeURIComponent(it.name)}`
                  a.download = it.name
                }
                a.style.display = 'none'
                document.body.appendChild(a)
                a.click()
                a.remove()
              } catch {}
            }
          }}
          onMoveSelected={() => {
            const ids = Array.from(selected)
            if (ids.length === 1) {
              const it = idToItem.get(ids[0]!)
              if (!it) return
              if (it.isDirectory) setMoveFolderId(it.id); else setMoveFileId(it.id)
            } else if (ids.length > 1) {
              setMoveBulkOpen(true)
            }
          }}
          contextFolderId={(selected.size === 1 && (() => { const it = idToItem.get(Array.from(selected)[0]!); return it && it.isDirectory ? it.id : undefined })()) as string | undefined}
          contextMenuDisabled={(selected.size === 1 && (() => { const it = idToItem.get(Array.from(selected)[0]!); return it && it.isDirectory ? (it.name.toLowerCase() === 'trash') : false })()) as boolean | undefined}
          onTrashSelected={async () => {
            const ids = Array.from(selected)
            for (const id of ids) {
              const it = idToItem.get(id)
              if (!it) continue
              const fd = new FormData()
              if (it.isDirectory) {
                fd.set('folderId', it.id)
                await moveFolderToTrashSubmitAction(fd)
              } else {
                fd.set('fileId', it.id)
                await moveFileToTrashSubmitAction(fd)
              }
            }
            router.refresh()
          }}
          onRestoreSelected={parentName === 'Trash' ? async () => {
            const ids = Array.from(selected)
            for (const id of ids) {
              const it = idToItem.get(id)
              if (!it) continue
              const fd = new FormData()
              if (it.isDirectory) {
                fd.set('folderId', it.id)
                await restoreFolderFromTrashSubmitAction(fd)
              } else {
                fd.set('fileId', it.id)
                await restoreFileFromTrashSubmitAction(fd)
              }
            }
            router.refresh()
          } : undefined}
        />
      ) : (
        <FiltersBar />
      )}
      <Table className="table-fixed w-full">
        <colgroup>
          <col style={{ width: '45%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[45%]">Name</TableHead>
            <TableHead className="w-[15%]">Owner</TableHead>
            <TableHead className="w-[15%]">Last Modified</TableHead>
            <TableHead className="w-[15%]">Location</TableHead>
            <TableHead className="w-[10%] text-right"></TableHead>
          </TableRow>
        </TableHeader>
      </Table>
      <div onClick={handleTableClick} className="flex-1 overflow-auto">
        <Table className="table-fixed w-full">
          <colgroup>
            <col style={{ width: '45%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
               <TableCell colSpan={5} className="text-muted-foreground">No results</TableCell>
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
                setRenameFolderId={setRenameFolderId}
                setRenameFileId={setRenameFileId}
                activeId={activeId}
                allIds={allIds}
                overFolderId={overFolderId}
                onPreview={(it) => {
                  let rel = it.path || it.name
                  if (rel.startsWith('/data/files/')) {
                    rel = rel.slice('/data/files/'.length)
                  } else if (rel.startsWith('data/files/')) {
                    rel = rel.slice('data/files/'.length)
                  }
                  const url = isImageName(it.name)
                    ? `/images/${encodeURIComponent(it.name)}`
                    : `/files/${rel.split('/').map(encodeURIComponent).join('/')}`
                  setPreview({ name: it.name, url })
                }}
                isStarred={starredOverrides.has(item.id) ? starredOverrides.get(item.id)! : Boolean((item as any).starred)}
                onToggleStar={async () => {
                  const current = starredOverrides.has(item.id) ? starredOverrides.get(item.id)! : Boolean((item as any).starred)
                  const next = !current
                  setStarredOverrides(prev => {
                    const m = new Map(prev)
                    m.set(item.id, next)
                    return m
                  })
                  try {
                    if (item.isDirectory) {
                      const fd = new FormData()
                      fd.set('folderId', item.id)
                      fd.set('starred', String(next))
                      if (parentId) fd.set('currentFolderId', parentId)
                      await setFolderStarredSubmitAction(fd)
                    } else {
                      const fd = new FormData()
                      fd.set('fileId', item.id)
                      fd.set('starred', String(next))
                      if (parentId) fd.set('currentFolderId', parentId)
                      await setFileStarredSubmitAction(fd)
                    }
                  } catch {
                    // Revert on error
                    setStarredOverrides(prev => {
                      const m = new Map(prev)
                      m.set(item.id, current)
                      return m
                    })
                  }
                }}
              />
            ))
          )}
          </TableBody>
        </Table>
      </div>
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
      <MoveItemDialog
        open={moveBulkOpen}
        onOpenChange={(next) => { setMoveBulkOpen(next) }}
        itemId={''}
        itemType="file"
        itemName={''}
        bulkItems={Array.from(selected)
          .map(id => idToItem.get(id))
          .filter((it): it is FileEntry => !!it)
          .map(it => ({ id: it.id, isDirectory: it.isDirectory, name: it.name }))}
      />
      <RenameItemDialog
        open={!!renameFolderId}
        onOpenChange={(next) => { if (!next) setRenameFolderId(null) }}
        itemId={renameFolderId ?? ''}
        itemType="folder"
        itemName={renameFolderId ? (idToItem.get(renameFolderId)?.name ?? '') : ''}
      />
      <RenameItemDialog
        open={!!renameFileId}
        onOpenChange={(next) => { if (!next) setRenameFileId(null) }}
        itemId={renameFileId ?? ''}
        itemType="file"
        itemName={renameFileId ? (idToItem.get(renameFileId)?.name ?? '') : ''}
      />
      <DragOverlay modifiers={[snapCenterToCursor]}>
        {activeId ? (() => {
          const it = idToItem.get(activeId)
          if (!it) return null
          const isMulti = selected.size > 1 && selected.has(activeId)
          if (isMulti) {
            return (
              <div className="inline-flex pointer-events-none rounded-full border bg-muted text-foreground shadow-md px-3 py-1.5 text-sm items-center gap-2 w-auto">
                <FaFolder className="h-4 w-4" />
                <span className="font-medium">{selected.size} items</span>
              </div>
            )
          }
          return (
            <div className="inline-flex pointer-events-none rounded-full border bg-muted text-foreground shadow-md px-3 py-1.5 text-sm items-center gap-2 w-auto">
              {it.isDirectory ? (
                <FaFolder className="h-4 w-4" />
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
  setRenameFolderId: (id: string) => void
  setRenameFileId: (id: string) => void
  activeId: string | null
  allIds: string[]
  overFolderId: string | null
  onPreview: (item: FileEntry) => void
  isStarred: boolean
  onToggleStar: () => void
}

function RowItem({ item, parentName, selected, onRowClick, onRowDoubleClick, setMoveFolderId, setMoveFileId, setRenameFolderId, setRenameFileId, activeId, allIds, overFolderId, onPreview, isStarred, onToggleStar }: RowItemProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: item.id })
  const { isOver, setNodeRef: setDropRef } = item.isDirectory ? useDroppable({ id: `folder/${item.id}` }) : ({ isOver: false, setNodeRef: (_: any) => {} } as any)
  const setRowRef = (node: any) => { setNodeRef(node); if (item.isDirectory) setDropRef(node) }
  const isDragging = !!activeId && (activeId === item.id || (selected.size > 1 && selected.has(activeId) && selected.has(item.id)))
  const isTrashFolder = item.name.toLowerCase() === 'trash'
  const highlightDragged = isDragging && !!overFolderId
  const row = (
    <TableRow
      ref={setRowRef}
      onClick={(e) => onRowClick(e, allIds.indexOf(item.id), item)}
      onDoubleClick={() => onRowDoubleClick(item)}
      data-row
      className={`group h-14 select-none cursor-pointer [&>td]:align-middle ${selected.has(item.id) ? 'bg-muted' : 'hover:bg-muted/50'} ${isDragging ? 'opacity-50' : ''} ${item.isDirectory && isOver ? 'ring-2 ring-primary/40' : ''} ${highlightDragged ? 'ring-2 ring-primary/50' : ''}`}
      {...listeners}
      {...attributes}
    >
      <TableCell className="w-[45%] flex items-center gap-2 mt-2 min-w-0">
        {item.isDirectory ? (
          <FaFolder className="h-4 w-4" />
        ) : (
          getIconForFile(item.name)
        )}
        <span className="truncate flex-1 min-w-0">{item.name}</span>
      </TableCell>
      <TableCell className="w-[15%]">You</TableCell>
      <TableCell className="w-[15%]">{new Date(item.modifiedMs).toLocaleString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}</TableCell>
      <TableCell className="w-[15%] min-w-0">
        <span className="block truncate">{parentName ? `/${parentName}` : '/'}</span>
      </TableCell>
      <TableCell className="w-[10%] text-right">
        <div className="flex items-center justify-end gap-1">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Download" onClick={() => {
              try {
                const a = document.createElement('a')
                if (item.isDirectory) {
                  a.href = `/api/folders/download?id=${encodeURIComponent(item.id)}`
                  a.download = ''
                } else {
                  let rel = item.path || item.name
                  if (rel.startsWith('/data/files/')) {
                    rel = rel.slice('/data/files/'.length)
                  } else if (rel.startsWith('data/files/')) {
                    rel = rel.slice('data/files/'.length)
                  }
                  const href = isImageName(item.name)
                    ? `/images/${encodeURIComponent(item.name)}`
                    : `/files/${rel.split('/').map(encodeURIComponent).join('/')}`
                  a.href = href
                  a.download = item.name
                }
                a.style.display = 'none'
                document.body.appendChild(a)
                a.click()
                a.remove()
              } catch {}
            }}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Rename" onClick={() => {
              if (item.isDirectory) setRenameFolderId(item.id); else setRenameFileId(item.id)
            }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Star" onClick={onToggleStar}>
              {isStarred ? <FaStar className="h-4 w-4" /> : <FaRegStar className="h-4 w-4" />}
            </Button>
          </div>
          {item.isDirectory ? (
            <ItemContextMenu
              itemId={item.id}
              itemType="folder"
              onMove={() => setMoveFolderId(item.id)}
              onRename={() => setRenameFolderId(item.id)}
              disabled={isTrashFolder}
            />
          ) : (
            <ItemContextMenu
              itemId={item.id}
              itemType="file"
              onMove={() => setMoveFileId(item.id)}
              onRename={() => setRenameFileId(item.id)}
              onPreview={isPreviewable(item.name) ? (() => onPreview(item)) : undefined}
              onDownload={() => {
                try {
                  let rel = item.path || item.name
                  if (rel.startsWith('/data/files/')) {
                    rel = rel.slice('/data/files/'.length)
                  } else if (rel.startsWith('data/files/')) {
                    rel = rel.slice('data/files/'.length)
                  }
                  const href = isImageName(item.name)
                    ? `/images/${encodeURIComponent(item.name)}`
                    : `/files/${rel.split('/').map(encodeURIComponent).join('/')}`
                  const a = document.createElement('a')
                  a.href = href
                  a.download = item.name
                  a.style.display = 'none'
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                } catch {}
              }}
            />
          )}
        </div>
      </TableCell>
    </TableRow>
  )

  if (!item.isDirectory) {
    return (
      <ItemContextMenu
        itemId={item.id}
        itemType="file"
        onMove={() => setMoveFileId(item.id)}
        onRename={() => setRenameFileId(item.id)}
        onPreview={isPreviewable(item.name) ? (() => onPreview(item)) : undefined}
        onDownload={() => {
          try {
            let rel = item.path || item.name
            if (rel.startsWith('/data/files/')) {
              rel = rel.slice('/data/files/'.length)
            } else if (rel.startsWith('data/files/')) {
              rel = rel.slice('data/files/'.length)
            }
            const href = isImageName(item.name)
              ? `/images/${encodeURIComponent(item.name)}`
              : `/files/${rel.split('/').map(encodeURIComponent).join('/')}`
            const a = document.createElement('a')
            a.href = href
            a.download = item.name
            a.style.display = 'none'
            document.body.appendChild(a)
            a.click()
            a.remove()
          } catch {}
        }}
      >
        {row}
      </ItemContextMenu>
    )
  }
  return (
    <ItemContextMenu
      itemId={item.id}
      itemType="folder"
      onMove={() => setMoveFolderId(item.id)}
      onRename={() => setRenameFolderId(item.id)}
      disabled={isTrashFolder}
    >
      {row}
    </ItemContextMenu>
  )
}


