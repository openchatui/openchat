"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { Palette, Pipette, Plus, Check } from "lucide-react"

interface TextColorDropdownProps {
  editor: Editor | null
  className?: string
}

const STORAGE_KEY = "text-color-recent"

// Hues rows (in degrees) and shade columns (lightness %)
const HUES = [0, 20, 35, 50, 75, 120, 160, 190, 210, 230, 260, 280, 300, 330]
const LIGHTNESSES = [15, 25, 35, 45, 55, 65, 75, 85]

// Grayscale row (lightness from dark to light)
const GRAY_LIGHTNESSES = [0, 15, 25, 35, 45, 55, 70, 85]

function readRecent(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function writeRecent(colors: string[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(colors.slice(0, 8)))
  } catch {}
}

export function TextColorDropdown({ editor, className }: TextColorDropdownProps) {
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const colorInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRecent(readRecent())
  }, [])

  const currentColor = useMemo(
    () => (editor ? (editor.getAttributes("textStyle").color as string | undefined) : undefined),
    [editor, editor?.state?.selection?.from, editor?.state?.selection?.to]
  )

  if (!editor) return null

  const applyColor = (color: string) => {
    editor.chain().focus().setColor(color).run()
    const next = [color, ...recent.filter((c) => c.toLowerCase() !== color.toLowerCase())]
    setRecent(next.slice(0, 8))
    writeRecent(next)
    setOpen(false)
  }

  const pickWithEyeDropper = async () => {
    // @ts-expect-error EyeDropper is not typed in TS DOM lib yet in all envs
    const EyeDropperCtor = typeof window !== "undefined" ? window.EyeDropper : undefined
    if (EyeDropperCtor) {
      try {
        const picker = new EyeDropperCtor()
        const result = await picker.open()
        if (result?.sRGBHex) applyColor(result.sRGBHex)
        return
      } catch {
        // ignore cancellations
      }
    }
    colorInputRef.current?.click()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className={cn("gap-2", className)} onMouseDown={(e) => e.preventDefault()}>
          <Palette />
          {currentColor && (
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded"
              style={{ backgroundColor: currentColor, border: "1px solid rgba(0,0,0,0.1)" }}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto p-2">
        {/* Grayscale row */}
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${LIGHTNESSES.length}, 1.75rem)` }}
        >
          {GRAY_LIGHTNESSES.map((l, i) => {
            const color = `hsl(0 0% ${l}%)`
            const active = currentColor?.toLowerCase() === color.toLowerCase()
            return (
              <button
                key={`gray-${l}-${i}`}
                type="button"
                className={cn(
                  "relative flex h-7 w-7 items-center justify-center rounded-full",
                  active && "ring-2 ring-offset-1 ring-primary"
                )}
                onClick={() => applyColor(color)}
                aria-label={`Set color ${color}`}
                title={`Set color ${color}`}
              >
                <span
                  className="block h-6 w-6 rounded-full"
                  style={{ backgroundColor: color, border: "1px solid rgba(0,0,0,0.1)" }}
                />
                {active && <Check className="absolute h-3 w-3 text-background" />}
              </button>
            )
          })}
        </div>
        {/* Hue rows with shade columns */}
        <div className="mt-2 space-y-1">
          {HUES.map((h) => (
            <div
              key={`row-${h}`}
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${LIGHTNESSES.length}, 1.75rem)` }}
            >
              {LIGHTNESSES.map((l) => {
                const color = `hsl(${h} 85% ${l}%)`
                const key = `h-${h}-l-${l}`
                const active = currentColor?.toLowerCase() === color.toLowerCase()
                return (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      "relative flex h-7 w-7 items-center justify-center rounded-full",
                      active && "ring-2 ring-offset-1 ring-primary"
                    )}
                    onClick={() => applyColor(color)}
                    aria-label={`Set color ${color}`}
                    title={`Set color ${color}`}
                  >
                    <span
                      className="block h-6 w-6 rounded-full"
                      style={{ backgroundColor: color, border: "1px solid rgba(0,0,0,0.1)" }}
                    />
                    {active && <Check className="absolute h-3 w-3 text-background" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">Custom</DropdownMenuLabel>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {recent.length === 0 && (
              <span className="text-muted-foreground text-xs">No recent colors</span>
            )}
            {recent.map((color, i) => (
              <button
                key={`${color}-${i}`}
                type="button"
                className="relative flex h-7 w-7 items-center justify-center rounded-full"
                onClick={() => applyColor(color)}
                aria-label={`Set recent color ${color}`}
                title={`Set recent color ${color}`}
              >
                <span
                  className="block h-6 w-6 rounded-full"
                  style={{ backgroundColor: color, border: "1px solid rgba(0,0,0,0.1)" }}
                />
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <input
              ref={colorInputRef}
              type="color"
              className="hidden"
              onChange={(e) => e.target.value && applyColor(e.target.value)}
            />
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 p-0" onClick={() => colorInputRef.current?.click()} title="Custom color">
              <Plus className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 p-0" onClick={pickWithEyeDropper} title="Pick from screen">
              <Pipette className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default TextColorDropdown


