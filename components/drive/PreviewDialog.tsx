"use client"
import { useMemo } from "react"
import { Dialog, DialogTitle, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { XIcon, DownloadIcon } from "lucide-react"
import ZoomableImage from "./ZoomableImage"
import dynamic from "next/dynamic"
const PdfAsImages = dynamic(() => import("./PdfAsImages"), { ssr: false })
const VideoPreviewer = dynamic(() => import("./VideoPreviewer"), { ssr: false })

interface PreviewDialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  name: string
  url: string
}

function isImageFile(nameOrUrl: string): boolean {
  const lower = nameOrUrl.toLowerCase()
  return [
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".tif", ".heic", ".heif", ".avif"
  ].some(ext => lower.endsWith(ext))
}

function isPdfFile(nameOrUrl: string): boolean {
  return nameOrUrl.toLowerCase().endsWith(".pdf")
}

function isVideoFile(nameOrUrl: string): boolean {
  const lower = nameOrUrl.toLowerCase()
  return [
    ".mp4", ".webm", ".ogg", ".ogv", ".mov", ".m4v", ".mkv"
  ].some(ext => lower.endsWith(ext))
}

export function PreviewDialog({ open, onOpenChange, name, url }: PreviewDialogProps) {
  const kind: "image" | "pdf" | "video" | "other" = useMemo(() => {
    if (isImageFile(name) || isImageFile(url)) return "image"
    if (isPdfFile(name) || isPdfFile(url)) return "pdf"
    if (isVideoFile(name) || isVideoFile(url)) return "video"
    return "other"
  }, [name, url])

  const INITIAL_SCALE = 0.75

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/80" />
        <div className="fixed inset-0 z-50 flex flex-col w-screen h-screen rounded-none p-0 border-none">
        <DialogTitle className="sr-only">{name}</DialogTitle>
        <div className="w-full h-full flex flex-col bg-background/0">
          <div className="h-12 flex items-center justify-between px-3 sm:px-4 ">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)} aria-label="Close preview">
                <XIcon className="h-4 w-4" />
              </Button>
              <div className="truncate text-sm sm:text-base font-medium" title={name}>{name}</div>
            </div>
            <div className="flex items-center gap-2">
              <a href={url} download>
                <Button variant="default" size="sm" className="gap-2">
                  <DownloadIcon className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-transparent overflow-auto">
            {kind === "image" && (
              <ZoomableImage src={url} alt={name} initialScale={INITIAL_SCALE} minScale={INITIAL_SCALE} maxScale={8} />
            )}
            {kind === "pdf" && (
              <PdfAsImages fileUrl={url} />
            )}
            {kind === "video" && (
              <VideoPreviewer url={url} name={name} />
            )}
            {kind === "other" && (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                Preview not available. Use the Download button to view this file.
              </div>
            )}
          </div>
        </div>
        </div>
      </DialogPortal>
    </Dialog>
  )
}

export default PreviewDialog


