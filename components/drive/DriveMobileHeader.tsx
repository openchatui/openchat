"use client"
import { FilesSearchBar } from "@/components/drive/FilesSearchBar"
import { FiltersBar } from "@/components/drive/FiltersBar"

export function DriveMobileHeader() {
  return (
    <div className="md:hidden fixed top-0 inset-x-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="px-3 pt-2">
        <FilesSearchBar />
      </div>
      <div className="px-3 pb-2">
        <FiltersBar />
      </div>
    </div>
  )
}


