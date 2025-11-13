"use client"
import type { FileEntry } from "@/lib/modules/drive"
import { useRouter } from "next/navigation"
import { useMemo, useState, useCallback, useEffect } from "react"
import { Users, Download, Pencil } from "lucide-react"
import { FaStar, FaRegStar, FaFolder, FaFilePdf, FaImage } from "react-icons/fa"
import { BsFileEarmarkSpreadsheetFill } from "react-icons/bs"
import { Table2 } from "lucide-react"
import { LuSquareMenu } from "react-icons/lu"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"
import {
  setFileStarred,
  setFolderStarred,
} from "@/lib/api/drive"
import { RenameItemDialog } from "./RenameItemDialog"

const PreviewDialog = dynamic(() => import("./PreviewDialog"))

interface FilesResultsTableMobileProps {
  entries: FileEntry[]
  parentName?: string
}

function getIconForFile(name: string, item?: FileEntry) {
  if (item && (item as any).meta) {
    const meta = (item as any).meta as any
    if (meta.mimeType) {
      if (meta.mimeType === "application/vnd.google-apps.document") {
        return <LuSquareMenu className="h-4 w-4 text-blue-500" />
      }
      if (meta.mimeType === "application/vnd.google-apps.spreadsheet") {
        return <Table2 className="h-4 w-4 text-green-500" />
      }
    }
  }

  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : ""
  if (["jpg","jpeg","png","gif","webp","svg","bmp","tiff","tif","heic","heif","avif"].includes(ext)) {
    return <FaImage className="h-4 w-4 text-red-400" />
  }
  if (["mp4","webm","ogg","ogv","mov","m4v","mkv"].includes(ext)) {
    return <FaFilePdf className="h-4 w-4 text-red-400" />
  }
  if (ext === "pdf") {
    return <FaFilePdf className="text-red-400" />
  }
  if (["xls","xlsx","xlsm","csv","tsv","ods","numbers"].includes(ext)) {
    return <BsFileEarmarkSpreadsheetFill className="h-4 w-4 text-green-400" />
  }
  return <FaFilePdf className="h-4 w-4 text-blue-400" />
}

function isImageName(name: string) {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : ""
  return ["jpg","jpeg","png","gif","webp","svg","bmp","tiff","tif","heic","heif","avif"].includes(ext)
}

function getFileUrl(item: FileEntry): string {
  const isGoogle = item.path === item.name && !item.path.includes("/")
  if (isGoogle) return `/api/v1/drive/file/${encodeURIComponent(item.id)}`

  let rel = item.path || item.name
  if (rel.startsWith("/data/files/")) rel = rel.slice("/data/files/".length)
  else if (rel.startsWith("data/files/")) rel = rel.slice("data/files/".length)
  return isImageName(item.name)
    ? `/images/${encodeURIComponent(item.name)}`
    : `/files/${rel.split("/").map(encodeURIComponent).join("/")}`
}

function truncateFilename(name: string, maxLength = 24): string {
  if (name.length <= maxLength) return name
  const lastDot = name.lastIndexOf(".")
  if (lastDot > 0 && lastDot < name.length - 1) {
    const ext = name.slice(lastDot + 1)
    const reserved = ext.length + 1
    const available = maxLength - 3 - reserved
    if (available <= 0) return name.slice(0, Math.max(0, maxLength - 3)) + "..."
    return name.slice(0, available) + "..." + "." + ext
  }
  return name.slice(0, Math.max(0, maxLength - 3)) + "..."
}

export function FilesResultsTableMobile({ entries, parentName }: FilesResultsTableMobileProps) {
  const router = useRouter()
  const [preview, setPreview] = useState<{ name: string; url: string; fileId?: string; mimeType?: string } | null>(null)
  const [renameFileId, setRenameFileId] = useState<string | null>(null)
  const [optimisticStars, setOptimisticStars] = useState<Record<string, boolean>>({})
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const idToItem = useMemo(() => {
    const m = new Map<string, FileEntry>()
    for (const e of entries) m.set(e.id, e)
    return m
  }, [entries])
  const visibleEntries = useMemo(
    () => entries.filter((e) => !hiddenIds.has(e.id)),
    [entries, hiddenIds]
  )
  useEffect(() => {
    const onItem = (e: Event) => {
      try {
        const ce = e as CustomEvent<{ id?: string }>
        const id = ce.detail?.id
        if (id) {
          setHiddenIds((prev) => {
            const next = new Set(prev)
            next.add(id)
            return next
          })
        }
      } catch {}
    }
    const onItems = (e: Event) => {
      try {
        const ce = e as CustomEvent<{ ids?: string[] }>
        const ids = Array.isArray(ce.detail?.ids) ? ce.detail?.ids as string[] : []
        if (ids.length) {
          setHiddenIds((prev) => {
            const next = new Set(prev)
            for (const id of ids) next.add(id)
            return next
          })
        }
      } catch {}
    }
    window.addEventListener("drive:itemTrashed", onItem as EventListener)
    window.addEventListener("drive:itemsTrashed", onItems as EventListener)
    return () => {
      window.removeEventListener("drive:itemTrashed", onItem as EventListener)
      window.removeEventListener("drive:itemsTrashed", onItems as EventListener)
    }
  }, [])

  const onOpen = useCallback((item: FileEntry) => {
    if (item.isDirectory) {
      router.push(`/drive/folder/${encodeURIComponent(item.path)}`)
      return
    }
    const url = getFileUrl(item)
    const meta = (item as any).meta as any
    setPreview({ name: item.name, url, mimeType: meta?.mimeType, fileId: item.id })
  }, [router])

  return (
    <div className="w-full pt-0 pb-20">
      <ul className="divide-y">
        {visibleEntries.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-3">
            <div className="flex-shrink-0">
              {item.isDirectory ? <FaFolder className="h-5 w-5" /> : getIconForFile(item.name, item)}
            </div>
            <button className="flex-1 text-left min-w-0" onClick={() => onOpen(item)}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate font-medium">{truncateFilename(item.name, 24)}</span>
                {!item.isDirectory && item.ownedByMe === false && (
                  <Users className="h-4 w-4 text-blue-500 flex-shrink-0" />
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {new Date(item.modifiedMs).toLocaleString("en-US", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </div>
            </button>
            <div className="flex items-center gap-1">
              {!item.isDirectory && (
                <Button variant="ghost" size="icon" aria-label="Rename" onClick={() => { setRenameFileId(item.id) }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Star"
                onClick={async () => {
                  const current = (optimisticStars[item.id] ?? Boolean((item as any).starred))
                  const next = !current
                  try {
                    setOptimisticStars((prev) => ({ ...prev, [item.id]: next }))
                    if (item.isDirectory) await setFolderStarred({ id: item.id, starred: next })
                    else await setFileStarred({ id: item.id, starred: next })
                    router.refresh()
                  } catch {
                    setOptimisticStars((prev) => ({ ...prev, [item.id]: current }))
                  }
                }}
              >
                {(optimisticStars[item.id] ?? Boolean((item as any).starred)) ? <FaStar className="h-4 w-4" /> : <FaRegStar className="h-4 w-4" />}
              </Button>
              {!item.isDirectory && (
                <Button variant="ghost" size="icon" aria-label="Download" onClick={() => {
                  const a = document.createElement("a")
                  a.href = `/api/v1/drive/file/${encodeURIComponent(item.id)}/download`
                  a.download = item.name
                  a.style.display = "none"
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                }}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <PreviewDialog
        open={!!preview}
        onOpenChange={(next: boolean) => { if (!next) setPreview(null) }}
        name={preview?.name ?? ""}
        url={preview?.url ?? ""}
        mimeType={preview?.mimeType}
        fileId={preview?.fileId}
      />
      <RenameItemDialog
        open={!!renameFileId}
        onOpenChange={(next: boolean) => {
          if (!next) {
            setRenameFileId(null)
            router.refresh()
          }
        }}
        itemId={renameFileId ?? ""}
        itemType="file"
        itemName={renameFileId ? idToItem.get(renameFileId)?.name ?? "" : ""}
      />
    </div>
  )
}


