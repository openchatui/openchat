"use client"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { ContextMenuItem } from "@/components/ui/context-menu"

interface TrashButtonProps {
  onConfirm?: () => void | Promise<void>
  asMenuItem?: boolean
  showLabel?: boolean // when false, render icon-only button
  confirmTitle?: string
  confirmDescription?: string
  disabled?: boolean
  formAction?: (formData: FormData) => Promise<void> // optional server action for forms
  hiddenFields?: Record<string, string>
}

export function TrashButton({ onConfirm, asMenuItem = false, showLabel = true, confirmTitle = "Move to Trash", confirmDescription = "This item will be moved to your Trash. You can restore it later from the Trash.", disabled = false, formAction, hiddenFields }: TrashButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {asMenuItem ? (
          <ContextMenuItem disabled={disabled} onSelect={(e) => { e.preventDefault() }}>
            <Trash2 className="mr-2 h-4 w-4" />
            {showLabel ? "Move to Trash" : null}
          </ContextMenuItem>
        ) : (
          <Button variant="ghost" size={showLabel ? "default" : "icon"} disabled={disabled}>
            <Trash2 className="h-4 w-4" />
            {showLabel ? <span className="ml-2">Move to Trash</span> : null}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {formAction ? (
            <form action={formAction} className="inline-flex">
              {hiddenFields && Object.entries(hiddenFields).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <AlertDialogAction type="submit">Move to Trash</AlertDialogAction>
            </form>
          ) : (
            <AlertDialogAction onClick={() => { if (onConfirm) void onConfirm() }}>Move to Trash</AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}


