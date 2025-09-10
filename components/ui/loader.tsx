"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface AnimatedLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  message?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

export function AnimatedLoader({
  size = 'md',
  className,
  message
}: AnimatedLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Temporarily commented out SVG - using simple spinner instead */}
        {/*
        <object
          type="image/svg+xml"
          data="/AnimatedOpenChat.svg"
          className="w-full h-full"
          aria-label="Loading animation"
        >
          <div className="w-full h-full bg-muted rounded animate-pulse flex items-center justify-center">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        </object>
        */}

        {/* Simple CSS spinner */}
        <div className="w-full h-full border-2 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
      {message && (
        <p className="text-muted-foreground mt-2 text-sm">{message}</p>
      )}
    </div>
  )
}

// Legacy component for backward compatibility
export function Loader({ size = 'md', className, message }: AnimatedLoaderProps) {
  return <AnimatedLoader size={size} className={className} message={message} />
}
