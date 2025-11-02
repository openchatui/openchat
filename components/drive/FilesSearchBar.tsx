"use client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { FiSidebar } from "react-icons/fi"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

export function FilesSearchBar() {
  const router = useRouter()
  const params = useSearchParams()
  const { toggleSidebar } = useSidebar()
  const initial = useMemo(() => params.get('q') ?? '', [params])
  const [q, setQ] = useState(initial)

  useEffect(() => {
    setQ(initial)
  }, [initial])

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setQ(next)
    const usp = new URLSearchParams(Array.from(params.entries()))
    if (next) usp.set('q', next); else usp.delete('q')
    router.replace(`?${usp.toString()}`)
  }, [params, router])

  return (
    <div className="w-full flex justify-center my-2 md:my-4">
      <div className="w-full md:w-3/5">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle sidebar"
            onClick={toggleSidebar}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full"
          >
            <FiSidebar className="h-5 w-5" />
          </Button>
          <Input
            placeholder="Search files and folders"
            value={q}
            onChange={onChange}
            className="h-12 rounded-full border-none pl-12 pr-4 w-full"
          />
        </div>
      </div>
    </div>
  )
}


