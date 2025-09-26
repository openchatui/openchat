"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { SaveStatusButton } from "@/components/ui/save-button"
import { uploadFolderSubmitAction } from "@/actions/files"
import { useRouter } from "next/navigation"

interface UploadFolderDialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  parent?: string
}

export function UploadFolderDialog({ open, onOpenChange, parent = "" }: UploadFolderDialogProps) {
  const router = useRouter()

  async function onSubmit(formData: FormData) {
    await uploadFolderSubmitAction(formData)
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload folder</DialogTitle>
          <DialogDescription>Select a folder to upload its contents.</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3" encType="multipart/form-data">
          <input type="hidden" name="parent" value={parent} />
          <div className="space-y-2">
            <Label htmlFor="folder-input">Choose folder</Label>
            <Input id="folder-input" name="files" type="file" multiple {...({ webkitdirectory: '' } as any)} {...({ directory: '' } as any)} />
          </div>
          <div className="flex justify-end">
            <SaveStatusButton label="Upload" />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


