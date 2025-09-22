"use client"

import { useEffect, useRef, useState } from "react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { useFormStatus } from "react-dom"
import { Check, Save as SaveIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SaveStatusButtonProps extends ButtonProps {
  label?: string
  successDurationMs?: number
  disabled?: boolean
}

export function SaveStatusButton({
  label = "Save",
  successDurationMs = 1500,
  className,
  disabled,
  type = "submit",
  ...rest
}: SaveStatusButtonProps) {
  const { pending } = useFormStatus()
  const [showSuccess, setShowSuccess] = useState(false)
  const wasPendingRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Transition from pending -> idle triggers success
    if (wasPendingRef.current && !pending) {
      setShowSuccess(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setShowSuccess(false), successDurationMs)
    }
    wasPendingRef.current = pending
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [pending, successDurationMs])

  const isDisabled = disabled || pending

  return (
    <Button
      type={type as any}
      disabled={isDisabled}
      className={cn("flex items-center gap-2", className)}
      {...rest}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showSuccess ? (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white">
          <Check className="h-3.5 w-3.5" />
        </span>
      ) : (
        <>
          <SaveIcon className="h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  )
}


