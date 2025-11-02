"use client"
import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

export function FilesSearchBar() {
  const router = useRouter()
  const params = useSearchParams()
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
        <Input
          placeholder="Search files and folders"
          value={q}
          onChange={onChange}
          className="h-12 rounded-full border-none"
        />
      </div>
    </div>
  )
}


