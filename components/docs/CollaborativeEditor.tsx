"use client"

import { useEffect, useMemo, useState } from "react"
import type React from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Collaboration from "@tiptap/extension-collaboration"
import { PaginationPlus } from "tiptap-pagination-plus"
import { TextStyle, FontSize } from "@tiptap/extension-text-style"
import { FontFamily } from "@tiptap/extension-text-style/font-family"
import Color from "@tiptap/extension-color"
import Highlight from "@tiptap/extension-highlight"
import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { EditorToolbar } from "./EditorToolbar"
import styles from "./editor-content.module.css"

interface CollaborativeEditorProps {
  documentId: string
  user: {
    id: string
    name: string | null
    email: string
    image?: string | null
  }
  token: string
  className?: string
  chrome?: 'card' | 'page'
  initialHTML?: string
  enableGoogleSave?: boolean
  syncWithGoogle?: boolean
}

export function CollaborativeEditor({ documentId, user, token, className, chrome = 'card', initialHTML, enableGoogleSave, syncWithGoogle }: CollaborativeEditorProps) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)

  const ydoc = useMemo(() => new Y.Doc(), [])

  // Invert explicit grayscale text colors (including black/white) in imported HTML
  // This helps Google Docs content render with proper contrast in our dark UI
  const invertBlackWhiteInHTML = (html: string): string => {
    try {
      // Use DOM parsing to reliably read and set inline styles
      const container = document.createElement('div')
      container.innerHTML = html

      const elements = container.querySelectorAll<HTMLElement>('[style], font[color]')
      elements.forEach((el) => {
        // Handle <font color="..."> legacy attribute just in case
        const fontColorAttr = el.getAttribute('color')
        if (fontColorAttr) {
          const c = fontColorAttr.trim().toLowerCase()
          const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c)
          const rgb = /^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/i.exec(c)
          const rgba = /^rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9.]+)\s*\)$/i.exec(c)
          const namedBlack = c === 'black'
          const namedWhite = c === 'white'
          const setHex = (r: number, g: number, b: number) => {
            const toHex = (n: number) => n.toString(16).padStart(2, '0')
            el.setAttribute('color', `#${toHex(r)}${toHex(g)}${toHex(b)}`)
          }
          if (hex) {
            let r = 0, g = 0, b = 0
            const h = hex[1]
            if (h.length === 3) {
              r = parseInt(h[0] + h[0], 16); g = parseInt(h[1] + h[1], 16); b = parseInt(h[2] + h[2], 16)
            } else {
              r = parseInt(h.slice(0,2), 16); g = parseInt(h.slice(2,4), 16); b = parseInt(h.slice(4,6), 16)
            }
            const isGray = Math.abs(r - g) < 2 && Math.abs(r - b) < 2
            if (isGray) setHex(255 - r, 255 - g, 255 - b)
          } else if (rgb || rgba || namedBlack || namedWhite) {
            let r = 0, g = 0, b = 0
            if (rgb || rgba) {
              const m = (rgb || rgba) as RegExpExecArray
              r = parseInt(m[1], 10); g = parseInt(m[2], 10); b = parseInt(m[3], 10)
            } else if (namedBlack) { r = 0; g = 0; b = 0 } else if (namedWhite) { r = 255; g = 255; b = 255 }
            const isGray = Math.abs(r - g) < 2 && Math.abs(r - b) < 2
            if (isGray) {
              const ir = 255 - r, ig = 255 - g, ib = 255 - b
              el.setAttribute('color', `rgb(${ir}, ${ig}, ${ib})`)
            }
          }
        }

        // Handle inline style color
        const current = (el.style && el.style.color) ? el.style.color.trim().toLowerCase() : ''
        if (!current) return

        // Invert grayscale (including black/white)
        const rgb = /^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/i.exec(current)
        const rgba = /^rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9.]+)\s*\)$/i.exec(current)
        const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(current)
        const hsl = /^hsl\(\s*([0-9.]+)\s*(?:deg|)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*\)$/i.exec(current)
        const namedBlack = current === 'black'
        const namedWhite = current === 'white'
        if (rgb || rgba) {
          const m = (rgb || rgba) as RegExpExecArray
          const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10)
          const isGray = Math.abs(r - g) < 2 && Math.abs(r - b) < 2
          if (isGray) {
            const ir = 255 - r, ig = 255 - g, ib = 255 - b
            el.style.color = `rgb(${ir}, ${ig}, ${ib})`
          }
        } else if (hex) {
          const h = hex[1]
          let r = 0, g = 0, b = 0
          if (h.length === 3) {
            r = parseInt(h[0] + h[0], 16); g = parseInt(h[1] + h[1], 16); b = parseInt(h[2] + h[2], 16)
          } else {
            r = parseInt(h.slice(0,2), 16); g = parseInt(h.slice(2,4), 16); b = parseInt(h.slice(4,6), 16)
          }
          const isGray = Math.abs(r - g) < 2 && Math.abs(r - b) < 2
          if (isGray) {
            const toHex = (n: number) => n.toString(16).padStart(2, '0')
            const ir = 255 - r, ig = 255 - g, ib = 255 - b
            el.style.color = `#${toHex(ir)}${toHex(ig)}${toHex(ib)}`
          }
        } else if (hsl) {
          const s = parseFloat(hsl[2])
          const l = parseFloat(hsl[3])
          const isGray = s === 0
          if (isGray) {
            const invL = Math.max(0, Math.min(100, 100 - l))
            el.style.color = `hsl(0 0% ${invL}%)`
          }
        } else if (namedBlack) {
          el.style.color = '#ffffff'
        } else if (namedWhite) {
          el.style.color = '#000000'
        }
      })

      return container.innerHTML
    } catch {
      // Fallback to regex swap if DOM parsing fails for any reason
      return html
        // color: black/white (named)
        .replace(/color\s*:\s*black\b/gi, 'color: #ffffff')
        .replace(/color\s*:\s*white\b/gi, 'color: #000000')
        // color: #000 / #000000
        .replace(/color\s*:\s*#000\b/gi, 'color: #ffffff')
        .replace(/color\s*:\s*#000000\b/gi, 'color: #ffffff')
        .replace(/color\s*:\s*#fff\b/gi, 'color: #000000')
        .replace(/color\s*:\s*#ffffff\b/gi, 'color: #000000')
        // color: rgb/rgba
        .replace(/color\s*:\s*rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/gi, 'color: rgb(255, 255, 255)')
        .replace(/color\s*:\s*rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([0-9.]+)\s*\)/gi, 'color: rgba(255, 255, 255, $1)')
        .replace(/color\s*:\s*rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/gi, 'color: rgb(0, 0, 0)')
        .replace(/color\s*:\s*rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([0-9.]+)\s*\)/gi, 'color: rgba(0, 0, 0, $1)')
    }
  }

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL
    if (!url) {
      // Fail silently but render a non-collaborative editor
      return
    }

    const p = new HocuspocusProvider({
      url,
      name: documentId,
      token,
      document: ydoc,
    })

    setProvider(p)

    return () => {
      p.destroy()
      setProvider(null)
    }
  }, [documentId, token, ydoc])

  const editor = useEditor({
    autofocus: true,
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      PaginationPlus.configure({
        pageHeight: 1056,
        pageGap: 24,
        pageBreakBackground: "#1d1d1d",
        footerRight: "",
        marginTop: 50,
        marginBottom: 80,
        marginLeft: 100,
        marginRight: 100,
        contentMarginTop: 0,
        contentMarginBottom: 0,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        validate: (href) => {
          try {
            // Basic URL validation; allow mailto
            if (href.startsWith("mailto:")) return true
            const u = new URL(href)
            return Boolean(u.protocol && u.host)
          } catch {
            return false
          }
        },
      }),
      Collaboration.configure({ document: ydoc }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral dark:prose-invert max-w-none focus:outline-none",
      },
    },
  })

  // If we have initialHTML and no collaboration provider (local mode), set content once
  useEffect(() => {
    if (!editor) return
    if (provider) return
    if (!initialHTML) return
    const isEmpty = editor.getText().trim().length === 0
    if (isEmpty) {
      const transformed = invertBlackWhiteInHTML(initialHTML)
      editor.commands.setContent(transformed)
    }
  }, [editor, provider, initialHTML])

  // When collaboration provider syncs the empty doc for the first time, hydrate from initialHTML
  useEffect(() => {
    if (!provider || !editor) return
    if (!initialHTML) return
    let hasInitialized = false
    const onSynced = () => {
      if (hasInitialized) return
      // Only set content if the doc is still empty
      const isEmpty = editor.getText().trim().length === 0
      if (isEmpty) {
        const transformed = invertBlackWhiteInHTML(initialHTML)
        editor.commands.setContent(transformed)
      }
      hasInitialized = true
    }
    // Hocuspocus provider emits 'synced' when doc is loaded
    provider.on('synced', onSynced)
    return () => {
      provider.off('synced', onSynced as any)
    }
  }, [provider, editor, initialHTML])

  // Optional: bidirectional sync with Google Docs (MVP: throttled, plain text outbound; pull if modified externally)
  useEffect(() => {
    if (!syncWithGoogle) return
    if (!editor) return
    let lastPushMs = 0
    let lastEditMs = 0
    let pushTimer: ReturnType<typeof setTimeout> | null = null
    const debounceMs = 8000
    const onUpdate = () => {
      lastEditMs = Date.now()
      if (pushTimer) clearTimeout(pushTimer)
      pushTimer = setTimeout(async () => {
        try {
          const html = editor.getHTML()
          const res = await fetch(`/api/v1/drive/file/sync/${encodeURIComponent(documentId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html }),
          })
          if (res.ok) lastPushMs = Date.now()
        } catch {}
      }, debounceMs)
    }
    editor.on('update', onUpdate)

    let cancelled = false
    const pollMs = 20000
    const poll = async () => {
      if (cancelled) return
      try {
        const meta = await fetch(`/api/v1/drive/file/sync/${encodeURIComponent(documentId)}?mode=meta`).then(r => r.json()).catch(() => null) as any
        const modifiedMs = meta && typeof meta.modifiedMs === 'number' ? meta.modifiedMs : null
        if (modifiedMs && modifiedMs > lastPushMs + 1500) {
          const html = await fetch(`/api/v1/drive/file/sync/${encodeURIComponent(documentId)}?mode=html`).then(r => r.text()).catch(() => '')
          if (html && html.length > 0) {
            const now = Date.now()
            const recentEdit = now - lastEditMs < 3000
            if (!recentEdit) {
              const current = editor.getHTML()
              const transformed = invertBlackWhiteInHTML(html)
              if (current !== transformed) {
                editor.commands.setContent(transformed)
              }
            }
          }
        }
      } catch {}
      setTimeout(poll, pollMs)
    }
    const pollId = setTimeout(poll, pollMs)
    return () => {
      editor.off('update', onUpdate)
      if (pushTimer) clearTimeout(pushTimer)
      clearTimeout(pollId)
      cancelled = true
    }
  }, [syncWithGoogle, editor, documentId])

  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    // If clicking outside the contenteditable area (e.g., in padding), keep focus on editor
    // without moving the caret to the end.
    const target = e.target as HTMLElement
    const insideEditable = target.closest('[contenteditable="true"]')
    if (!insideEditable) {
      e.preventDefault()
      if (editor && !editor.isFocused) {
        // Focus editor but preserve current selection/caret position
        editor.commands.focus()
      }
    }
  }

  // Removed custom auto page-break logic in favor of PaginationPlus

  // Clicking outside the document does nothing (no focus changes)

  const toolbar = (
    <div className="px-3 py-2 border-b bg-background sticky top-0 z-30" data-editor-toolbar>
      <EditorToolbar editor={editor as Editor | null} documentId={documentId} enableGoogleSave={enableGoogleSave} />
    </div>
  )

  if (chrome === 'page') {
    return (
      <div className={cn("w-full bg-muted/40 h-full overflow-hidden flex flex-col", className)}>
        {toolbar}
        <div className="flex-1 overflow-auto">
          <div className="flex justify-center py-6">
            <div className="bg-background shadow-md w-[816px]" onMouseDown={handleMouseDown}>
              <EditorContent editor={editor} className={styles.editorContent} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-md border bg-background">
        {toolbar}
        <div className="px-4 py-3" onMouseDown={handleMouseDown}>
          <EditorContent editor={editor} className={styles.editorContent} />
        </div>
      </div>
    </div>
  )
}

export default CollaborativeEditor
