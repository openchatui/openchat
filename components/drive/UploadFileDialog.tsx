"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { SaveStatusButton } from "@/components/ui/save-button"
import { useRouter } from "next/navigation"

interface UploadFileDialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  parent?: string
}

export function UploadFileDialog({ open, onOpenChange, parent = "" }: UploadFileDialogProps) {
  const router = useRouter()

  async function onSubmit(formData: FormData) {
    await fetch('/api/v1/drive/file/upload', { method: 'POST', body: formData })
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload file</DialogTitle>
          <DialogDescription>Select a file to upload.</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-3">
          <input type="hidden" name="parent" value={parent} />
          <div className="space-y-2">
            <Label htmlFor="file-input">Choose file</Label>
            <Input id="file-input" name="file" type="file" required />
          </div>
          <div className="flex justify-end">
            <SaveStatusButton label="Upload" />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


