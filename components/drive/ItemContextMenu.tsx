"use client";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  Download,
  PencilLine,
  FolderOpen,
  FolderInput,
  Star,
  Redo,
  MoreVertical,
} from "lucide-react";
import { TrashButton } from "./TrashButton";
import {
  moveFolderToTrashSubmitAction,
  moveFileToTrashSubmitAction,
} from "@/actions/files";
import { Button } from "@/components/ui/button";

interface ItemContextMenuProps {
  itemId: string;
  itemType: "folder" | "file";
  children?: React.ReactNode;
  onMove: () => void;
  onDownload?: () => void;
  onRename?: () => void;
  onTrash?: () => void;
  onAddShortcut?: () => void;
  onAddStarred?: () => void;
  onPreview?: () => void;
  disabled?: boolean;
}

export function ItemContextMenu({
  itemId,
  itemType,
  children,
  onMove,
  onDownload,
  onRename,
  onTrash,
  onAddShortcut,
  onAddStarred,
  onPreview,
  disabled = false,
}: ItemContextMenuProps) {
  function handleDownload() {
    if (onDownload) return onDownload();
    try {
      if (itemType === "folder") {
        const url = `/api/folders/download?id=${encodeURIComponent(itemId)}`;
        const a = document.createElement("a");
        a.href = url;
        a.download = "";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        // For files we require onDownload to be provided to generate the correct URL
      }
    } catch {}
  }

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children ? (
          children
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onMouseDown={(e) => {
              if (e.button === 0) {
                e.preventDefault();
                e.currentTarget.dispatchEvent(
                  new window.MouseEvent("contextmenu", {
                    bubbles: true,
                    cancelable: true,
                    clientX: e.clientX,
                    clientY: e.clientY,
                  })
                );
              }
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleDownload();
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onRename?.();
          }}
        >
          <PencilLine className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        {onPreview ? (
          <ContextMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onPreview?.();
            }}
          >
            <PencilLine className="mr-2 h-4 w-4" />
            Preview
          </ContextMenuItem>
        ) : null}
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderOpen className="mr-2 h-4 w-4" />
            Organize
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onMove();
              }}
            >
              <FolderInput className="mr-2 h-4 w-4" />
              Move
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onAddShortcut?.();
              }}
            >
              <Redo className="mr-2 h-4 w-4" />
              Add shortcut
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onAddStarred?.();
              }}
            >
              <Star className="mr-2 h-4 w-4" />
              Add to starred
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        {itemType === "folder" ? (
          <TrashButton
            asMenuItem
            formAction={moveFolderToTrashSubmitAction}
            hiddenFields={{ folderId: itemId }}
          />
        ) : (
          <TrashButton
            asMenuItem
            formAction={moveFileToTrashSubmitAction}
            hiddenFields={{ fileId: itemId }}
          />
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
