"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Plus as PlusIcon, X as XIcon } from "lucide-react"

interface TagsEditorProps {
  tags: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  className?: string
}

export function TagsEditor({ tags, onChange, disabled = false, className }: TagsEditorProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const addTag = useCallback((raw: string) => {
    const trimmed = raw.trim().replace(/,/g, "")
    if (!trimmed) return
    if (tags.includes(trimmed)) return
    onChange([...tags, trimmed])
  }, [onChange, tags])

  const handleConfirm = useCallback(() => {
    addTag(value)
    // Keep the input open to avoid dialog focus highlight and allow rapid entry
    setValue("")
    // keep isAdding = true
  }, [addTag, value])

  const handleCancel = useCallback(() => {
    setValue("")
    setIsAdding(false)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      e.stopPropagation()
      handleConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      handleCancel()
    }
  }, [handleConfirm, handleCancel])

  return (
    <div className={"flex flex-wrap items-center gap-2 " + (className || "")}> 
      {tags.map((t, idx) => (
        <Badge key={`${t}-${idx}`} variant="secondary" className="pr-1">
          <span className="truncate max-w-[10rem]">{t}</span>
          <button
            type="button"
            aria-label={`Remove ${t}`}
            className="ml-1 rounded-sm hover:bg-muted p-0.5"
            onClick={() => onChange(tags.filter((_, i) => i !== idx))}
            disabled={disabled}
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </Badge>
      ))}

      {isAdding ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleCancel}
          className="bg-transparent border-none outline-none shadow-none px-0 py-0 h-6 text-sm rounded-none placeholder-transparent"
          aria-label="New tag"
        />
      ) : (
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            disabled={disabled}
            aria-label="Add tag"
            className="h-7 w-7 inline-flex items-center justify-center rounded-full border hover:bg-accent text-foreground/80"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            disabled={disabled}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Add Tags
          </button>
        </div>
      )}
    </div>
  )
}


