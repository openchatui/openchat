"use client";
import type { FileEntry } from "@/lib/modules/drive";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Pencil, Users, MessageSquare } from "lucide-react";
import { FaStar, FaRegStar, FaFolder } from "react-icons/fa";
import { useCallback, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ItemContextMenu } from "./ItemContextMenu";
import { getFileIconComponent } from "@/lib/utils/file-icons";
const SelectionBar = dynamic(
  () => import("./SelectionBar").then((m) => m.SelectionBar),
  { loading: () => <div className="mb-2 h-10" /> }
);
const FiltersBar = dynamic(
  () => import("./FiltersBar").then((m) => m.FiltersBar),
  { loading: () => <div className="mb-2 h-10" /> }
);
const MoveItemDialog = dynamic(() =>
  import("./MoveItemDialog").then((m) => m.MoveItemDialog)
);
const RenameItemDialog = dynamic(() =>
  import("./RenameItemDialog").then((m) => m.RenameItemDialog)
);
import {
  moveItemsBulk,
  moveFolderToTrash,
  moveFileToTrash,
  restoreFolder,
  restoreFile,
  setFileStarred,
  setFolderStarred,
} from "@/lib/api/drive";
import { Breadcrumbs } from "./Breadcrumbs";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type Modifier,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  pointerWithin,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { CreateContextMenu } from "./CreateContextMenu";
import PreviewDialog from "./PreviewDialog";

// Using snapCenterToCursor to ensure the pill follows the pointer

interface FilesResultsTableProps {
  entries: FileEntry[];
  parentName?: string;
  parentId?: string;
  breadcrumb?: { id: string; name: string }[];
  isGoogleDriveFolder?: boolean;
}


function isPreviewable(name: string, item?: FileEntry) {
  // Check if it's a Google Workspace file
  if (item && (item as any).meta) {
    const meta = (item as any).meta as any;
    if (
      meta.mimeType &&
      meta.mimeType.startsWith("application/vnd.google-apps.")
    ) {
      return ["document", "spreadsheet", "presentation"].some(
        (type) => meta.mimeType === `application/vnd.google-apps.${type}`
      );
    }
  }

  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (
    [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "bmp",
      "tiff",
      "tif",
      "heic",
      "heif",
      "avif",
      "pdf",
      "csv",
      "docx",
      "doc",
      "xlsx",
      "xls",
    ].includes(ext)
  )
    return true;
  return false;
}

function isImageName(name: string) {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "bmp",
    "tiff",
    "tif",
    "heic",
    "heif",
    "avif",
  ].includes(ext);
}

function isGoogleDriveFile(item: FileEntry): boolean {
  // Google Drive files have IDs that are not file paths
  // They typically don't contain slashes and are alphanumeric with dashes/underscores
  // Also, their path equals their name (since DB path is null -> becomes filename)
  return item.path === item.name && !item.path.includes("/");
}

function getFileUrl(item: FileEntry): string {
  // Check if this is a Google Drive file
  if (isGoogleDriveFile(item)) {
    return `/api/v1/drive/file/${encodeURIComponent(item.id)}`;
  }

  // Local file handling
  let rel = item.path || item.name;
  if (rel.startsWith("/data/files/")) {
    rel = rel.slice("/data/files/".length);
  } else if (rel.startsWith("data/files/")) {
    rel = rel.slice("data/files/".length);
  }

  return isImageName(item.name)
    ? `/images/${encodeURIComponent(item.name)}`
    : `/files/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

function getDownloadUrl(item: FileEntry): string {
  // Check if this is a Google Drive file
  if (isGoogleDriveFile(item)) {
    // If it's a shared file, open in Google Drive instead
    if (item.ownedByMe === false && item.webViewLink) {
      return item.webViewLink;
    }
    return `/api/v1/drive/file/${encodeURIComponent(item.id)}/download`;
  }

  // For local files, use the same URL as getFileUrl
  return getFileUrl(item);
}

function handleFileDownload(item: FileEntry): void {
  try {
    // For shared Google Drive files, open in new tab
    if (
      isGoogleDriveFile(item) &&
      item.ownedByMe === false &&
      item.webViewLink
    ) {
      window.open(item.webViewLink, "_blank");
      return;
    }

    // For regular files, trigger download
    const a = document.createElement("a");
    a.href = getDownloadUrl(item);
    a.download = item.name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (error) {
    console.error("Download failed:", error);
  }
}

export function FilesResultsTable({
  entries,
  parentName,
  parentId,
  breadcrumb,
  isGoogleDriveFolder,
}: FilesResultsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [moveFolderId, setMoveFolderId] = useState<string | null>(null);
  const [moveFileId, setMoveFileId] = useState<string | null>(null);
  const [restoreFolderId, setRestoreFolderId] = useState<string | null>(null);
  const [moveBulkOpen, setMoveBulkOpen] = useState<boolean>(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overFolderId, setOverFolderId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    name: string;
    url: string;
    mimeType?: string;
    fileId?: string;
  } | null>(null);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFileId, setRenameFileId] = useState<string | null>(null);
  // Optimistic star overrides for instant UI feedback
  const [starredOverrides, setStarredOverrides] = useState<
    Map<string, boolean>
  >(new Map());
  // Only enable drag and drop on client to avoid hydration mismatch
  const [isDndReady, setIsDndReady] = useState(false);
  // Optimistically hide items that were moved to trash so UI updates instantly
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const idToItem = useMemo(() => {
    const m = new Map<string, FileEntry>();
    for (const e of entries) m.set(e.id, e);
    return m;
  }, [entries]);

  // Only enable DnD after client-side hydration to avoid hydration mismatch
  useEffect(() => {
    setIsDndReady(true);
  }, []);

  // Trigger a one-time sync on load when viewing a Google Drive folder
  useEffect(() => {
    if (!isGoogleDriveFolder) return;
    let cancelled = false;
    (async () => {
      try {
        await fetch("/api/v1/drive/sync", { method: "POST" });
        if (!cancelled) router.refresh();
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [isGoogleDriveFolder, router]);

  // Require a small pointer movement (and press delay on touch) before starting drag
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    })
  );

  const visibleEntries = useMemo(
    () => entries.filter((e) => !hiddenIds.has(e.id)),
    [entries, hiddenIds]
  );
  const allIds = useMemo(() => visibleEntries.map((e) => e.id), [visibleEntries]);

  const handleRowDoubleClick = useCallback(
    (item: FileEntry) => {
      if (item.isDirectory) {
        if (parentName === "Trash") {
          setRestoreFolderId(item.id);
          return;
        }
        router.push(`/drive/folder/${encodeURIComponent(item.path)}`);
        return;
      }
      // Prefer in-app preview for previewable types; only fall back to Drive for non-previewable shared files
      const lower = item.name.toLowerCase();
      const isPreviewableByExt =
        isImageName(item.name) ||
        lower.endsWith(".pdf") ||
        [
          "mp4",
          "webm",
          "ogg",
          "ogv",
          "mov",
          "m4v",
          "mkv",
          "csv",
          "doc",
          "docx",
          "xls",
          "xlsx",
        ].some((ext) => lower.endsWith("." + ext));
      if (
        !isPreviewableByExt &&
        (item.ownedByMe === false || (item.shared && item.webViewLink))
      ) {
        const driveUrl =
          item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`;
        window.open(driveUrl, "_blank");
        return;
      }

      const url = getFileUrl(item);
      const meta = (item as any).meta as any;
      setPreview({
        name: item.name,
        url,
        mimeType: meta?.mimeType,
        fileId: item.id,
      });
    },
    [router, setPreview, parentName]
  );

  const handleRowClick = useCallback(
    (e: React.MouseEvent, index: number, item: FileEntry) => {
      // Ignore if this is part of a double-click
      if (e.detail && e.detail > 1) return;

      const id = item.id;
      const isRange = e.shiftKey;
      const isToggle = e.metaKey || e.ctrlKey;

      setSelected((prev) => {
        if (isRange && lastIndex !== null) {
          const start = Math.min(lastIndex, index);
          const end = Math.max(lastIndex, index);
          const rangeIds = new Set(allIds.slice(start, end + 1));
          return rangeIds;
        }
        const next = new Set(prev);
        if (isToggle) {
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }
        // Single selection
        return new Set([id]);
      });
      setLastIndex(index);
    },
    [allIds, lastIndex]
  );

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("tr[data-row]")) return;
    if (target.closest('[data-selectionbar="true"]')) return;
    if (target.closest('[role="dialog"]')) return;
    setSelected(new Set());
    setLastIndex(null);
  }, []);

  const handleTableClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("tr[data-row]")) return;
    if (target.closest('[role="dialog"]')) return;
    setSelected(new Set());
    setLastIndex(null);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
    // If the dragged item isn't in the current selection, select it
    setSelected((prev) => (prev.has(id) ? prev : new Set([id])));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id ? String(event.over.id) : null;
    if (overId && overId.startsWith("folder/")) {
      setOverFolderId(overId.slice("folder/".length));
    } else {
      setOverFolderId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    try {
      let overId = event.over?.id ? String(event.over.id) : null;
      const activeIdLocal = event.active?.id ? String(event.active.id) : null;
      // Fallback: sometimes over can be null at drop time with overlays; use last hovered folder
      if (!overId && overFolderId) {
        overId = `folder/${overFolderId}`;
      }
      if (!overId || !activeIdLocal) return;
      if (!overId.startsWith("folder/")) return;
      const targetParentId = overId.slice("folder/".length);
      if (!targetParentId) return;
      // Determine items to move: if the active is part of selection, move all selected; otherwise move only active
      const idsToMove: string[] =
        selected.size > 1 && selected.has(activeIdLocal)
          ? Array.from(selected)
          : [activeIdLocal];
      // Separate into folders and files, skip moving an item into itself
      const folderIds: string[] = [];
      const fileIds: string[] = [];
      for (const id of idsToMove) {
        if (id === targetParentId) continue;
        const it = idToItem.get(id);
        if (!it) continue;
        if (it.isDirectory) folderIds.push(id);
        else fileIds.push(id);
      }
      if (folderIds.length === 0 && fileIds.length === 0) return;
      await moveItemsBulk({ targetParentId, folderIds, fileIds });
      router.refresh();
    } finally {
      setActiveId(null);
      setOverFolderId(null);
    }
  };

  const content = (
    <CreateContextMenu
      parentId={parentId ?? ""}
      disabled={parentName === "Trash"}
    >
      <div
        className="flex flex-col border p-4 rounded-2xl h-[90vh] w-full"
        onClick={handleBackgroundClick}
      >
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="mb-2 min-w-0">
            <Breadcrumbs segments={breadcrumb} />
          </div>
        )}
        {selected.size > 0 ? (
          <SelectionBar
            count={selected.size}
            onClear={() => {
              setSelected(new Set());
            }}
            onDownloadSelected={() => {
              const ids = Array.from(selected);
              for (const id of ids) {
                const it = idToItem.get(id);
                if (!it) continue;
                if (it.isDirectory) {
                  try {
                    const a = document.createElement("a");
                    a.href = `/api/v1/drive/folder/download?id=${encodeURIComponent(
                      it.id
                    )}`;
                    a.download = "";
                    a.style.display = "none";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  } catch {}
                } else {
                  handleFileDownload(it);
                }
              }
            }}
            onMoveSelected={() => {
              const ids = Array.from(selected);
              if (ids.length === 1) {
                const it = idToItem.get(ids[0]!);
                if (!it) return;
                if (it.isDirectory) setMoveFolderId(it.id);
                else setMoveFileId(it.id);
              } else if (ids.length > 1) {
                setMoveBulkOpen(true);
              }
            }}
            contextFolderId={
              (selected.size === 1 &&
                (() => {
                  const it = idToItem.get(Array.from(selected)[0]!);
                  return it && it.isDirectory ? it.id : undefined;
                })()) as string | undefined
            }
            contextMenuDisabled={
              (selected.size === 1 &&
                (() => {
                  const it = idToItem.get(Array.from(selected)[0]!);
                  return it && it.isDirectory
                    ? it.name.toLowerCase() === "trash"
                    : false;
                })()) as boolean | undefined
            }
            onTrashSelected={async () => {
              const ids = Array.from(selected);
              // Optimistically hide trashed items
              setHiddenIds((prev) => {
                const next = new Set(prev);
                for (const id of ids) next.add(id);
                return next;
              });
              setSelected(new Set());
              setLastIndex(null);
              try {
                const failed: string[] = [];
                for (const id of ids) {
                  const it = idToItem.get(id);
                  if (!it) continue;
                  try {
                    if (it.isDirectory) await moveFolderToTrash({ id: it.id });
                    else await moveFileToTrash({ id: it.id });
                  } catch {
                    failed.push(id);
                  }
                }
                if (failed.length > 0) {
                  setHiddenIds((prev) => {
                    const next = new Set(prev);
                    for (const id of failed) next.delete(id);
                    return next;
                  });
                }
              } finally {
                try {
                  window.dispatchEvent(
                    new CustomEvent("drive:itemsTrashed", { detail: { ids } })
                  );
                } catch {}
                router.refresh();
              }
            }}
            onRestoreSelected={
              parentName === "Trash"
                ? async () => {
                    const ids = Array.from(selected);
                    for (const id of ids) {
                      const it = idToItem.get(id);
                      if (!it) continue;
                      if (it.isDirectory) await restoreFolder({ id: it.id });
                      else await restoreFile({ id: it.id });
                    }
                    router.refresh();
                  }
                : undefined
            }
          />
        ) : (
          <FiltersBar />
        )}
        <Table className="table-fixed w-full ">
          <colgroup>
            <col style={{ width: "45%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">Name</TableHead>
              <TableHead className="w-[15%] hidden md:table-cell">Owner</TableHead>
              <TableHead className="w-[15%] hidden md:table-cell">Last Modified</TableHead>
              <TableHead className="w-[15%] hidden md:table-cell">Location</TableHead>
              <TableHead className="w-[10%] text-right"></TableHead>
            </TableRow>
          </TableHeader>
        </Table>
        <div onClick={handleTableClick} className="flex-1 overflow-auto">
          <Table className="table-fixed w-full">
            <colgroup>
              <col style={{ width: "45%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <TableBody>
              {visibleEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No results
                  </TableCell>
                </TableRow>
              ) : (
                visibleEntries.map((item) => (
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
                      const url = getFileUrl(it);
                      const meta = (it as any).meta as any;
                      setPreview({
                        name: it.name,
                        url,
                        mimeType: meta?.mimeType,
                        fileId: it.id,
                      });
                    }}
                    onTrashItem={(id) => {
                      setHiddenIds((prev) => {
                        const next = new Set(prev);
                        next.add(id);
                        return next;
                      });
                      setSelected((prev) => {
                        if (!prev.has(id)) return prev;
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                      });
                      try {
                        window.dispatchEvent(
                          new CustomEvent("drive:itemTrashed", { detail: { id } })
                        );
                      } catch {}
                    }}
                    isStarred={
                      starredOverrides.has(item.id)
                        ? starredOverrides.get(item.id)!
                        : Boolean((item as any).starred)
                    }
                    onToggleStar={async () => {
                      const current = starredOverrides.has(item.id)
                        ? starredOverrides.get(item.id)!
                        : Boolean((item as any).starred);
                      const next = !current;
                      setStarredOverrides((prev) => {
                        const m = new Map(prev);
                        m.set(item.id, next);
                        return m;
                      });
                      try {
                        if (item.isDirectory)
                          await setFolderStarred({
                            id: item.id,
                            starred: next,
                          });
                        else
                          await setFileStarred({ id: item.id, starred: next });
                      } catch {
                        // Revert on error
                        setStarredOverrides((prev) => {
                          const m = new Map(prev);
                          m.set(item.id, current);
                          return m;
                        });
                      }
                    }}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <AlertDialog
          open={!!restoreFolderId}
          onOpenChange={(next) => {
            if (!next) setRestoreFolderId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore folder?</AlertDialogTitle>
              <AlertDialogDescription>
                This folder will be moved out of Trash. You will be redirected
                to it after restore.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                onClick={async () => {
                  if (!restoreFolderId) return;
                  try {
                    const { parentId } = await restoreFolder({
                      id: restoreFolderId,
                    });
                    setRestoreFolderId(null);
                    if (parentId)
                      router.push(
                        `/drive/folder/${encodeURIComponent(parentId)}`
                      );
                    else router.push(`/drive`);
                    router.refresh();
                  } catch {}
                }}
              >
                Restore
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <MoveItemDialog
          open={!!moveFolderId}
          onOpenChange={(next) => {
            if (!next) setMoveFolderId(null);
          }}
          itemId={moveFolderId ?? ""}
          itemType="folder"
          itemName={moveFolderId ? idToItem.get(moveFolderId)?.name ?? "" : ""}
        />
        <MoveItemDialog
          open={!!moveFileId}
          onOpenChange={(next) => {
            if (!next) setMoveFileId(null);
          }}
          itemId={moveFileId ?? ""}
          itemType="file"
          itemName={moveFileId ? idToItem.get(moveFileId)?.name ?? "" : ""}
        />
        <MoveItemDialog
          open={moveBulkOpen}
          onOpenChange={(next) => {
            setMoveBulkOpen(next);
          }}
          itemId={""}
          itemType="file"
          itemName={""}
          bulkItems={Array.from(selected)
            .map((id) => idToItem.get(id))
            .filter((it): it is FileEntry => !!it)
            .map((it) => ({
              id: it.id,
              isDirectory: it.isDirectory,
              name: it.name,
            }))}
        />
        <RenameItemDialog
          open={!!renameFolderId}
          onOpenChange={(next) => {
            if (!next) setRenameFolderId(null);
          }}
          itemId={renameFolderId ?? ""}
          itemType="folder"
          itemName={
            renameFolderId ? idToItem.get(renameFolderId)?.name ?? "" : ""
          }
        />
        <RenameItemDialog
          open={!!renameFileId}
          onOpenChange={(next) => {
            if (!next) setRenameFileId(null);
          }}
          itemId={renameFileId ?? ""}
          itemType="file"
          itemName={renameFileId ? idToItem.get(renameFileId)?.name ?? "" : ""}
        />
        <DragOverlay modifiers={[snapCenterToCursor]}>
          {activeId
            ? (() => {
                const it = idToItem.get(activeId);
                if (!it) return null;
                const isMulti = selected.size > 1 && selected.has(activeId);
                if (isMulti) {
                  return (
                    <div className="inline-flex pointer-events-none rounded-full border bg-muted text-foreground shadow-md px-3 py-1.5 text-sm items-center gap-2 w-auto">
                      <FaFolder className="h-4 w-4" />
                      <span className="font-medium">{selected.size} items</span>
                    </div>
                  );
                }
                return (
                  <div className="inline-flex pointer-events-none rounded-full border bg-muted text-foreground shadow-md px-3 py-1.5 text-sm items-center gap-2 w-auto">
                    {it.isDirectory ? (
                      <FaFolder className="h-4 w-4" />
                    ) : (
                      getFileIconComponent(it.name, it)
                    )}
                    <span className="max-w-[320px] truncate font-medium">
                      {it.name}
                    </span>
                  </div>
                );
              })()
            : null}
        </DragOverlay>
        <PreviewDialog
          open={!!preview}
          onOpenChange={(next) => {
            if (!next) setPreview(null);
          }}
          name={preview?.name ?? ""}
          url={preview?.url ?? ""}
          mimeType={preview?.mimeType}
          fileId={preview?.fileId}
        />
      </div>
    </CreateContextMenu>
  );

  // Wrap with DndContext only after client-side hydration
  if (!isDndReady) {
    return content;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {content}
    </DndContext>
  );
}

interface RowItemProps {
  item: FileEntry;
  parentName?: string;
  selected: Set<string>;
  onRowClick: (e: React.MouseEvent, index: number, item: FileEntry) => void;
  onRowDoubleClick: (item: FileEntry) => void;
  setMoveFolderId: (id: string) => void;
  setMoveFileId: (id: string) => void;
  setRenameFolderId: (id: string) => void;
  setRenameFileId: (id: string) => void;
  activeId: string | null;
  allIds: string[];
  overFolderId: string | null;
  onPreview: (item: FileEntry) => void;
  onTrashItem: (id: string) => void;
  isStarred: boolean;
  onToggleStar: () => void;
}

function RowItem({
  item,
  parentName,
  selected,
  onRowClick,
  onRowDoubleClick,
  setMoveFolderId,
  setMoveFileId,
  setRenameFolderId,
  setRenameFileId,
  activeId,
  allIds,
  overFolderId,
  onPreview,
  onTrashItem,
  isStarred,
  onToggleStar,
}: RowItemProps) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef } = useDraggable({ id: item.id });
  const { isOver, setNodeRef: setDropRef } = item.isDirectory
    ? useDroppable({ id: `folder/${item.id}` })
    : ({ isOver: false, setNodeRef: (_: any) => {} } as any);
  const setRowRef = (node: any) => {
    setNodeRef(node);
    if (item.isDirectory) setDropRef(node);
  };
  const isDragging =
    !!activeId &&
    (activeId === item.id ||
      (selected.size > 1 && selected.has(activeId) && selected.has(item.id)));
  const isTrashFolder = item.name.toLowerCase() === "trash";
  const highlightDragged = isDragging && !!overFolderId;
  const row = (
    <TableRow
      ref={setRowRef}
      onClick={(e) => onRowClick(e, allIds.indexOf(item.id), item)}
      onDoubleClick={() => onRowDoubleClick(item)}
      data-row
      className={`group h-14 select-none cursor-pointer [&>td]:align-middle ${
        selected.has(item.id) ? "bg-muted" : "hover:bg-muted/50"
      } ${isDragging ? "opacity-50" : ""} ${
        item.isDirectory && isOver ? "ring-2 ring-primary/40" : ""
      } ${highlightDragged ? "ring-2 ring-primary/50" : ""}`}
      {...listeners}
      {...attributes}
    >
      <TableCell className="w-[45%] min-w-0">
        <div className="flex items-center gap-2 mt-2">
          {item.isDirectory ? (
            <FaFolder className="h-4 w-4" />
          ) : (
            getFileIconComponent(item.name, item)
          )}
          <span className="truncate flex-1 min-w-0">{item.name}</span>
          {!item.isDirectory && item.ownedByMe === false && (
            <span title="Shared with me" className="flex-shrink-0">
              <Users className="h-4 w-4 text-blue-500" />
            </span>
          )}
        </div>
        <div className="md:hidden ml-6 text-[11px] text-muted-foreground">
          {new Date(item.modifiedMs).toLocaleString("en-US", {
            timeZone: "UTC",
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}
        </div>
      </TableCell>
      <TableCell className="w-[15%] hidden md:table-cell">You</TableCell>
      <TableCell className="w-[15%] hidden md:table-cell">
        {new Date(item.modifiedMs).toLocaleString("en-US", {
          timeZone: "UTC",
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })}
      </TableCell>
      <TableCell className="w-[15%] min-w-0 hidden md:table-cell">
        <span className="block truncate">
          {parentName ? `/${parentName}` : "/"}
        </span>
      </TableCell>
      <TableCell className="w-[10%] text-right">
        <div className="flex items-center justify-end gap-1">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {!item.isDirectory && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Send to Chat"
                title="Send to Chat"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    const key = "chat-input";
                    const raw = sessionStorage.getItem(key);
                    const defaults = {
                      prompt: "",
                      files: [] as { name: string; size: number; type: string }[],
                      selectedToolIds: [] as string[],
                      selectedFilterIds: [] as string[],
                      imageGenerationEnabled: false,
                      webSearchEnabled: false,
                      codeInterpreterEnabled: false,
                      contextFiles: [] as { id: string; name: string }[],
                    };
                    const data = raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
                    const existing = Array.isArray((data as any).contextFiles)
                      ? ((data as any).contextFiles as { id: string; name: string }[])
                      : [];
                    const next = existing.some((f) => f && f.id === item.id)
                      ? existing
                      : [...existing, { id: item.id, name: item.name }];
                    (data as any).contextFiles = next;
                    sessionStorage.setItem(key, JSON.stringify(data));
                    // Also pass via URL params so the landing page can inject if needed
                    const cfid = encodeURIComponent(item.id);
                    const cfn = encodeURIComponent(item.name);
                    router.push(`/?cfid=${cfid}&cfn=${cfn}`);
                  } catch {
                    // ignore storage errors
                    const cfid = encodeURIComponent(item.id);
                    const cfn = encodeURIComponent(item.name);
                    router.push(`/?cfid=${cfid}&cfn=${cfn}`);
                  }
                }}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Download"
              onClick={() => {
                if (item.isDirectory) {
                  try {
                    const a = document.createElement("a");
                    a.href = `/api/v1/drive/folder/download?id=${encodeURIComponent(
                      item.id
                    )}`;
                    a.download = "";
                    a.style.display = "none";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  } catch {}
                } else {
                  handleFileDownload(item);
                }
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Rename"
              onClick={() => {
                if (item.isDirectory) setRenameFolderId(item.id);
                else setRenameFileId(item.id);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Star"
              onClick={onToggleStar}
            >
              {isStarred ? (
                <FaStar className="h-4 w-4" />
              ) : (
                <FaRegStar className="h-4 w-4" />
              )}
            </Button>
          </div>
          {item.isDirectory ? (
            <ItemContextMenu
              itemId={item.id}
              itemType="folder"
              onMove={() => setMoveFolderId(item.id)}
              onRename={() => setRenameFolderId(item.id)}
              onTrash={() => {
                onTrashItem(item.id);
              }}
              disabled={isTrashFolder}
            />
          ) : (
            <ItemContextMenu
              itemId={item.id}
              itemType="file"
              onMove={() => setMoveFileId(item.id)}
              onRename={() => setRenameFileId(item.id)}
              onPreview={
                isPreviewable(item.name, item)
                  ? () => onPreview(item)
                  : undefined
              }
              onDownload={() => handleFileDownload(item)}
              onTrash={() => {
                onTrashItem(item.id);
              }}
            />
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  if (!item.isDirectory) {
    return (
      <ItemContextMenu
        itemId={item.id}
        itemType="file"
        onMove={() => setMoveFileId(item.id)}
        onRename={() => setRenameFileId(item.id)}
        onPreview={
          isPreviewable(item.name, item) ? () => onPreview(item) : undefined
        }
        onDownload={() => handleFileDownload(item)}
        onTrash={() => {
          onTrashItem(item.id);
        }}
      >
        {row}
      </ItemContextMenu>
    );
  }
  return (
    <ItemContextMenu
      itemId={item.id}
      itemType="folder"
      onMove={() => setMoveFolderId(item.id)}
      onRename={() => setRenameFolderId(item.id)}
      onTrash={() => {
        onTrashItem(item.id);
      }}
      disabled={isTrashFolder}
    >
      {row}
    </ItemContextMenu>
  );
}
