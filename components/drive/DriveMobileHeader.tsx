"use client"
import { FilesSearchBar } from "@/components/drive/FilesSearchBar"
import { FiltersBar } from "@/components/drive/FiltersBar"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Image from "next/image"

export function DriveMobileHeader({ localRootId, googleRootId, isGoogleDriveFolder }: { localRootId: string; googleRootId: string | null; isGoogleDriveFolder: boolean }) {
  const router = useRouter()

  const canToggle = Boolean(googleRootId)
  const targetHref = isGoogleDriveFolder
    ? (localRootId ? `/drive/folder/${encodeURIComponent(localRootId)}` : "/drive")
    : `/drive/folder/${encodeURIComponent(googleRootId ?? "")}`
  const isActiveGoogle = isGoogleDriveFolder

  return (
    <div className="md:hidden fixed top-0 inset-x-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="px-3 pt-2">
        <FilesSearchBar />
      </div>
      <div className="px-3 pb-2 flex items-center justify-between gap-3">
        <FiltersBar />
        {canToggle && (
          <Button
            size="icon"
            className="h-9 w-9 rounded-full"
            variant={isActiveGoogle ? "default" : "ghost"}
            onClick={() => router.push(targetHref)}
            aria-label="Toggle drive source"
            aria-pressed={isActiveGoogle}
          >
            <Image
              src="/logos/Google_Drive.svg"
              alt="Google Drive"
              width={18}
              height={18}
              className={isActiveGoogle ? "opacity-100" : "opacity-60"}
            />
          </Button>
        )}
      </div>
    </div>
  )
}


