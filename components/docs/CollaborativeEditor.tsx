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
}

export function CollaborativeEditor({ documentId, user, token, className, chrome = 'card' }: CollaborativeEditorProps) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null)

  const ydoc = useMemo(() => new Y.Doc(), [])

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

  const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    // If clicking outside the contenteditable area (e.g., in padding), keep focus on editor
    const target = e.target as HTMLElement
    const insideEditable = target.closest('[contenteditable="true"]')
    if (!insideEditable) {
      e.preventDefault()
      editor?.commands.focus('end')
    }
  }

  // Removed custom auto page-break logic in favor of PaginationPlus

  // Clicking outside the document does nothing (no focus changes)

  const toolbar = (
    <div className="px-3 py-2 border-b bg-background sticky top-0 z-30" data-editor-toolbar>
      <EditorToolbar editor={editor as Editor | null} />
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
