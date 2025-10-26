"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SaveStatusButton } from "@/components/ui/save-button";
import { createFolderSubmitAction } from "@/actions/files";
import { useRouter } from "next/navigation";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  parent?: string;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  parent = "",
}: CreateFolderDialogProps) {
  const router = useRouter();

  async function onSubmit(formData: FormData) {
    await createFolderSubmitAction(formData);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>
            Create a new folder in the current location.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          <input type="hidden" name="parent" value={parent} />
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              name="name"
              placeholder="e.g. documents"
              required
            />
          </div>
          <div className="flex justify-end">
            <SaveStatusButton label="Create" />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
