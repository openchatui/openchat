"use client"

import React from 'react'
import { cn } from "@/lib/utils"

interface LoaderProps {
  className?: string
  message?: string
}

export function AnimatedLoader({ className, message }: LoaderProps) {
  return (
    <div
      className={cn('inline-block align-middle h-0.5 w-0.5', className)}
      role="status"
      aria-label={message || 'loading'}
    >
      <span className="block h-full w-full rounded-full border-2 border-current border-t-transparent animate-spin" />
    </div>
  )
}

// Alias for compatibility
export function Loader({ className, message }: LoaderProps) {
  return <AnimatedLoader className={className} message={message} />
}
