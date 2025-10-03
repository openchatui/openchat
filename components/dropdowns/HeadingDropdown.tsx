"use client"

import type { Editor } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface HeadingDropdownProps {
  editor: Editor | null
  className?: string
}

type HeadingOption = {
  key: string
  label: string
  apply: (editor: Editor) => void
  isActive: (editor: Editor) => boolean
}

const OPTIONS: HeadingOption[] = [
  {
    key: "paragraph",
    label: "Normal text",
    apply: (ed) => ed.chain().focus().setParagraph().run(),
    isActive: (ed) => ed.isActive("paragraph"),
  },
  {
    key: "title",
    label: "Title",
    apply: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (ed) => ed.isActive("heading", { level: 1 }),
  },
  {
    key: "h1",
    label: "Heading 1",
    apply: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (ed) => ed.isActive("heading", { level: 2 }),
  },
  {
    key: "h2",
    label: "Heading 2",
    apply: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (ed) => ed.isActive("heading", { level: 3 }),
  },
  {
    key: "h3",
    label: "Heading 3",
    apply: (ed) => ed.chain().focus().toggleHeading({ level: 4 }).run(),
    isActive: (ed) => ed.isActive("heading", { level: 4 }),
  },
]

function currentLabel(editor: Editor | null): string {
  if (!editor) return "Normal text"
  for (const opt of OPTIONS) {
    if (opt.isActive(editor)) return opt.label
  }
  return "Normal text"
}

export default function HeadingDropdown({ editor, className }: HeadingDropdownProps) {
  if (!editor) return null

  const value = (() => {
    for (const opt of OPTIONS) {
      if (opt.isActive(editor)) return opt.key
    }
    return "paragraph"
  })()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("min-w-36 justify-between", className)}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="truncate text-left">{currentLabel(editor)}</span>
          <svg aria-hidden viewBox="0 0 20 20" className="ml-2 h-4 w-4 opacity-70"><path d="M5.25 7.5 10 12.25 14.75 7.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Text style</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value}>
          {OPTIONS.map((opt) => (
            <DropdownMenuRadioItem
              key={opt.key}
              value={opt.key}
              onClick={() => opt.apply(editor)}
            >
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


