"use client"

import { useCallback, useState } from "react"
import type { Editor } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface FontSizeControlProps {
  editor: Editor | null
  className?: string
  min?: number
  max?: number
  step?: number
}

export default function FontSizeControl({ editor, className, min = 8, max = 96, step = 1 }: FontSizeControlProps) {
  const readCurrentPx = () => {
    if (!editor) return undefined
    const val = editor.getAttributes("textStyle").fontSize as string | undefined
    if (!val) return undefined
    const m = /([0-9]+)px/.exec(val)
    return m ? parseInt(m[1], 10) : undefined
  }
  const currentPx = readCurrentPx()

  const [draft, setDraft] = useState<string>("")
  const display = draft !== "" ? draft : (currentPx?.toString() ?? "16")

  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  const apply = useCallback((n: number) => {
    if (!editor) return
    const size = clamp(Math.round(n))
    editor.chain().focus().setFontSize(`${size}px`).run()
    setDraft("")
  }, [editor])

  const onMinus = () => {
    const n = parseInt(display || "0", 10)
    if (isNaN(n)) return
    apply(n - step)
  }

  const onPlus = () => {
    const n = parseInt(display || "0", 10)
    if (isNaN(n)) return
    apply(n + step)
  }

  const onChange = (v: string) => {
    setDraft(v.replace(/[^0-9]/g, ""))
  }

  const onCommit = () => {
    const n = parseInt(draft || display || "0", 10)
    if (!isNaN(n)) apply(n)
  }

  if (!editor) return null

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={onMinus} aria-label="Decrease font size">-</Button>
      <Input
        className="h-8 w-16 text-center"
        value={display}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit()
        }}
      />
      <Button type="button" variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={onPlus} aria-label="Increase font size">+</Button>
    </div>
  )
}


