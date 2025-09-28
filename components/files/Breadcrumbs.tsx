"use client"

import { useRouter } from "next/navigation"
import { useDroppable } from "@dnd-kit/core"
import { ChevronRight } from "lucide-react"

interface BreadcrumbsProps {
  segments: { id: string; name: string }[]
}

function Crumb({ id, name, isLast }: { id: string; name: string; isLast: boolean }) {
  const router = useRouter()
  const { isOver, setNodeRef } = useDroppable({ id: `folder/${id}` })
  return (
    <button
      ref={setNodeRef}
      onClick={() => router.push(`/drive/folder/${encodeURIComponent(id)}`)}
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-base hover:bg-muted ${isOver ? 'ring-2 ring-primary/50' : ''} ${isLast ? 'font-semibold' : ''}`}
      aria-label={`Go to ${name}`}
    >
      <span className="truncate max-w-[220px]">{name}</span>
    </button>
  )
}

export function Breadcrumbs({ segments }: BreadcrumbsProps) {
  if (!segments || segments.length === 0) return null
  return (
    <nav className="flex items-center gap-2 text-base" aria-label="Breadcrumb">
      {segments.map((s, idx) => (
        <div key={s.id} className="flex items-center gap-1">
          <Crumb id={s.id} name={s.name} isLast={idx === segments.length - 1} />
          {idx < segments.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      ))}
    </nav>
  )
}


