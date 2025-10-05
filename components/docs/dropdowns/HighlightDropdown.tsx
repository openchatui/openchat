"use client"

import type { Editor } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Highlighter, Eraser } from "lucide-react"

interface HighlightDropdownProps {
  editor: Editor | null
  className?: string
}

const HIGHLIGHT_COLORS = [
  "#FEF08A", // yellow-200
  "#FDE68A", // amber-200
  "#FBCFE8", // pink-200
  "#BFDBFE", // blue-200
  "#A7F3D0", // emerald-200
  "#FCA5A5", // red-300
  "#DDD6FE", // violet-200
  "#E5E7EB", // gray-200
]

export default function HighlightDropdown({ editor, className }: HighlightDropdownProps) {
  if (!editor) return null

  const current = editor.getAttributes("highlight").color as string | undefined

  const apply = (color: string) => {
    editor.chain().focus().unsetHighlight().setHighlight({ color }).run()
  }

  const clear = () => {
    editor.chain().focus().unsetHighlight().run()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className={cn("gap-2", className)} onMouseDown={(e) => e.preventDefault()}>
          <Highlighter />
          {current && (
            <span
              aria-hidden
              className="inline-block h-3 w-6 rounded"
              style={{ backgroundColor: current, border: "1px solid rgba(0,0,0,0.08)" }}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto p-2">
        <DropdownMenuLabel className="text-xs">Highlight</DropdownMenuLabel>
        <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(8, 1.75rem)` }}>
          {HIGHLIGHT_COLORS.map((color, i) => {
            const active = current?.toLowerCase() === color.toLowerCase()
            return (
              <button
                key={`${color}-${i}`}
                type="button"
                className={cn(
                  "relative flex h-7 w-7 items-center justify-center rounded",
                  active && "ring-2 ring-offset-1 ring-primary"
                )}
                onClick={() => apply(color)}
                aria-label={`Set highlight ${color}`}
                title={`Set highlight ${color}`}
              >
                <span
                  className="block h-5 w-5 rounded"
                  style={{ backgroundColor: color, border: "1px solid rgba(0,0,0,0.08)" }}
                />
              </button>
            )
          })}
        </div>
        <DropdownMenuSeparator className="my-2" />
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            <Eraser className="mr-2 h-4 w-4" /> Clear highlight
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


