"use client"

import { useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Separator } from "@/components/ui/separator"
import TextColorDropdown from "@/components/docs/dropdowns/TextColorDropdown"
import HeadingDropdown from "@/components/docs/dropdowns/HeadingDropdown"
import FontFamilyDropdown from "@/components/docs/dropdowns/FontFamilyDropdown"
import FontSizeControl from "@/components/docs/dropdowns/FontSizeControl"
import HighlightDropdown from "@/components/docs/dropdowns/HighlightDropdown"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code2,
  Undo2,
  Redo2,
  Heading1,
  Heading2,
  Link as LinkIcon,
  
} from "lucide-react"
import { cn } from "@/lib/utils"

interface EditorToolbarProps {
  editor: Editor | null
  className?: string
  documentId?: string
  enableGoogleSave?: boolean
}

export function EditorToolbar({ editor, className, documentId, enableGoogleSave }: EditorToolbarProps) {
  const [, setRerenderTick] = useState(0)
  const keepFocus = (e: React.MouseEvent) => e.preventDefault()

  const VSeparator = () => (
    <div aria-hidden className="mx-2 h-[20px] w-[2.5px] self-center bg-neutral-400 dark:bg-neutral-700" />
  )

  useEffect(() => {
    if (!editor) return
    const update = () => setRerenderTick((t) => t + 1)
    editor.on("selectionUpdate", update)
    editor.on("transaction", update)
    editor.on("focus", update)
    editor.on("blur", update)
    return () => {
      editor.off("selectionUpdate", update)
      editor.off("transaction", update)
      editor.off("focus", update)
      editor.off("blur", update)
    }
  }, [editor])

  if (!editor) return null

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Enter URL", previousUrl ?? "")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <div className="items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          onMouseDown={keepFocus}
        >
          <Undo2 />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          onMouseDown={keepFocus}
        >
          <Redo2 />
        </Button>
      </div>

      <VSeparator />

      <HeadingDropdown editor={editor} />

      <VSeparator />

      <FontFamilyDropdown editor={editor} />

      <VSeparator />

      <FontSizeControl editor={editor} />

      <VSeparator />
      
      <Toggle
        aria-label="Bold"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        onMouseDown={keepFocus}
      >
        <Bold />
      </Toggle>
      <Toggle
        aria-label="Italic"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        onMouseDown={keepFocus}
      >
        <Italic />
      </Toggle>
      <Toggle
        aria-label="Underline"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        onMouseDown={keepFocus}
      >
        <UnderlineIcon />
      </Toggle>
      <Toggle
        aria-label="Strike"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        onMouseDown={keepFocus}
      >
        <Strikethrough />
      </Toggle>

      <TextColorDropdown editor={editor} />

      <HighlightDropdown editor={editor} />

      <VSeparator />

      <Toggle
        aria-label="Bullet List"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        onMouseDown={keepFocus}
      >
        <List />
      </Toggle>
      <Toggle
        aria-label="Ordered List"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        onMouseDown={keepFocus}
      >
        <ListOrdered />
      </Toggle>
      <Toggle
        aria-label="Blockquote"
        pressed={editor.isActive("blockquote")}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        onMouseDown={keepFocus}
      >
        <Quote />
      </Toggle>
      <Toggle
        aria-label="Code Block"
        pressed={editor.isActive("codeBlock")}
        onPressedChange={() => editor.chain().focus().toggleCodeBlock().run()}
        onMouseDown={keepFocus}
      >
        <Code2 />
      </Toggle>


      <VSeparator />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={setLink}
        onMouseDown={keepFocus}
        className={cn(editor.isActive("link") && "bg-accent")}
      >
        <LinkIcon />
      </Button>
      
    </div>
  )
}

export default EditorToolbar
