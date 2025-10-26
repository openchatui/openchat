"use client";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  renameFileSubmitAction,
  renameFolderSubmitAction,
} from "@/actions/files";

interface RenameItemDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  itemId: string;
  itemType: "file" | "folder";
  itemName?: string;
}

export function RenameItemDialog({
  open,
  onOpenChange,
  itemId,
  itemType,
  itemName,
}: RenameItemDialogProps) {
  const [name, setName] = useState<string>(itemName || "");
  useEffect(() => {
    if (open) setName(itemName || "");
  }, [open, itemName]);

  const title = `Rename ${itemType === "folder" ? "folder" : "file"}`;
  const idFieldName = itemType === "folder" ? "folderId" : "fileId";
  const nameFieldName = itemType === "folder" ? "name" : "filename";

  async function onConfirm(formData: FormData) {
    if (itemType === "folder") {
      await renameFolderSubmitAction(formData);
    } else {
      await renameFileSubmitAction(formData);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Enter a new name.</DialogDescription>
        </DialogHeader>
        <form action={onConfirm} className="space-y-4">
          <input type="hidden" name={idFieldName} value={itemId} />
          <Input
            name={nameFieldName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={itemType === "folder" ? "Folder name" : "File name"}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Rename
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
