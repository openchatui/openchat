"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface LoaderProps {
  className?: string
  message?: string
}

// Simple loader that sizes purely via className (e.g., "h-4 w-4")
export function AnimatedLoader({ className, message }: LoaderProps) {
  return (
    <div className={cn('inline-block', className)} aria-label={message || 'loading'}>
      <object
        type="image/svg+xml"
        data="/AnimatedOpenChat-White.svg"
        width="100%"
        height="100%"
        className="block w-full h-full"
        style={{ colorScheme: 'light' }}
      >
        svg-animation
      </object>
    </div>
  )
}

// Alias for compatibility
export function Loader({ className, message }: LoaderProps) {
  return <AnimatedLoader className={className} message={message} />
}
