"use client"

import { useMemo, useState } from "react"
import type { Editor } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface FontFamilyDropdownProps {
  editor: Editor | null
  className?: string
}

const STATIC_GOOGLE_FONTS: string[] = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Nunito", "Rubik", "Raleway", "Work Sans",
  "Noto Sans", "Noto Serif", "Merriweather", "Playfair Display", "Source Sans Pro", "Source Serif Pro", "Source Code Pro",
  "DM Sans", "DM Serif Display", "DM Serif Text", "Outfit", "Manrope", "Karla", "Heebo", "Quicksand", "Kanit", "Cabin",
  "Oswald", "Mukta", "Fira Sans", "Inconsolata", "JetBrains Mono", "IBM Plex Sans", "IBM Plex Serif", "IBM Plex Mono",
  "Barlow", "Barlow Condensed", "Barlow Semi Condensed", "Sora", "Urbanist", "Plus Jakarta Sans", "Space Grotesk",
  "Space Mono", "Varela Round", "Overpass", "Hind", "Oxygen", "Asap", "Asap Condensed", "Exo 2", "Exo", "Signika",
  "Catamaran", "Bitter", "Merriweather Sans", "Titillium Web", "Teko", "Archivo", "Zilla Slab", "PT Sans", "PT Serif",
  "Lora", "Crimson Text", "Cormorant Garamond", "Cormorant Infant", "Abril Fatface", "Arvo", "Play", "Josefin Sans",
  "Mulish", "Figtree", "Syne", "Outfit", "Urbanist", "Noto Sans JP", "Noto Sans KR", "Noto Sans SC", "Noto Serif Display",
  "Anton", "Dancing Script", "Great Vibes", "Pacifico", "Lobster", "Indie Flower", "Amatic SC", "Shadows Into Light",
]

function familyToCssParam(family: string): string {
  return family.replace(/ /g, "+")
}

function ensureFontLoaded(family: string) {
  if (typeof document === "undefined") return
  const id = `gf-${familyToCssParam(family)}`
  if (document.getElementById(id)) return
  const link = document.createElement("link")
  link.id = id
  link.rel = "stylesheet"
  link.href = `https://fonts.googleapis.com/css2?family=${familyToCssParam(family)}:wght@100..900&display=swap`
  document.head.appendChild(link)
}

export default function FontFamilyDropdown({ editor, className }: FontFamilyDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [fonts] = useState<string[]>(STATIC_GOOGLE_FONTS)

  const uniqueFonts = useMemo(() => Array.from(new Set(fonts)), [fonts])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const source = uniqueFonts
    if (!q) return source.slice(0, 300)
    return source.filter((f) => f.toLowerCase().includes(q)).slice(0, 300)
  }, [uniqueFonts, query])

  if (!editor) return null

  const current = editor.getAttributes("textStyle").fontFamily as string | undefined

  const apply = (family: string) => {
    ensureFontLoaded(family)
    editor.chain().focus().setFontFamily(family).run()
    setOpen(false)
  }

  const clear = () => {
    editor.chain().focus().unsetFontFamily().run()
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("min-w-40 justify-between", className)}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="truncate text-left" style={{ fontFamily: current }}>{current ?? "Font"}</span>
          <svg aria-hidden viewBox="0 0 20 20" className="ml-2 h-4 w-4 opacity-70"><path d="M5.25 7.5 10 12.25 14.75 7.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-0">
        <div className="p-2">
          <DropdownMenuLabel className="px-0">Font family</DropdownMenuLabel>
          <div className="mt-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Google Fonts" className="h-8" />
          </div>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-72">
          <ul className="py-1">
            {filtered.map((family) => (
              <li key={family}>
                <button
                  type="button"
                  onClick={() => apply(family)}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-accent",
                    current === family && "bg-accent"
                  )}
                  style={{ fontFamily: family }}
                >
                  {family}
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button size="sm" variant="ghost" onClick={clear} className="w-full">Clear font</Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


