"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"

export interface ApiKeyFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  onSave: (value: string) => Promise<void>
  isLoading?: boolean
  placeholder?: string
  debounceMs?: number
  initiallySaved?: boolean
  onSavedChange?: (saved: boolean, value: string) => void
  autosave?: boolean
  showSavedIndicator?: boolean
  hideLabel?: boolean
}

export function ApiKeyField({
  label,
  value,
  onChange,
  onSave,
  isLoading,
  placeholder,
  debounceMs = 600,
  initiallySaved = false,
  onSavedChange,
  autosave = true,
  showSavedIndicator = true,
  hideLabel = false,
}: ApiKeyFieldProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [savedOk, setSavedOk] = useState<boolean>(initiallySaved)
  const [isRevealed, setIsRevealed] = useState(false)
  const onSaveRef = useRef(onSave)
  const onSavedChangeRef = useRef(onSavedChange)
  const prevValueRef = useRef<string | undefined>(undefined)

  useEffect(() => { onSaveRef.current = onSave }, [onSave])
  useEffect(() => { onSavedChangeRef.current = onSavedChange }, [onSavedChange])

  // Keep local saved state in sync with external signal when it changes
  useEffect(() => {
    if (!isSaving) setSavedOk(initiallySaved)
  }, [initiallySaved, isSaving])

  useEffect(() => {
    if (isLoading) return
    if (!autosave) return
    if (prevValueRef.current === value) return
    prevValueRef.current = value
    setSavedOk(false)
    const handle = setTimeout(async () => {
      setIsSaving(true)
      try {
        await onSaveRef.current(value)
        const ok = value.length > 0
        setSavedOk(ok)
        if (onSavedChangeRef.current) onSavedChangeRef.current(ok, value)
      } catch {
        setSavedOk(false)
        if (onSavedChangeRef.current) onSavedChangeRef.current(false, value)
      } finally {
        setIsSaving(false)
      }
    }, debounceMs)
    return () => clearTimeout(handle)
  }, [value, isLoading, debounceMs, autosave])

  return (
    <div className={hideLabel ? "" : "space-y-2"}>
      {!hideLabel && <Label>{label}</Label>}
      <div className="relative">
        <Input
          type={isRevealed ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={isLoading}
          className={showSavedIndicator ? "pr-24" : "pr-12"}
        />
        <button
          type="button"
          aria-pressed={isRevealed}
          aria-label="Toggle visibility"
          onClick={() => setIsRevealed(v => !v)}
          className="absolute inset-y-0 right-3 my-auto h-7 w-7 inline-flex items-center justify-center rounded bg-transparent text-white hover:bg-transparent disabled:opacity-50"
          disabled={!!isLoading}
        >
          {isRevealed ? <EyeOff className="h-4 w-4 text-white" /> : <Eye className="h-4 w-4 text-white" />}
        </button>
        {showSavedIndicator && !isSaving && savedOk && value.length > 0 && (
          <div className="pointer-events-none absolute inset-y-0 right-12 flex items-center">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}


