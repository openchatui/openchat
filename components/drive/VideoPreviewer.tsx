"use client"
import { useRef, useEffect } from "react"

interface VideoPreviewerProps {
  url: string
  name: string
}

export default function VideoPreviewer({ url, name }: VideoPreviewerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    // Attempt to reset playback when URL changes
    el.pause()
    el.load()
  }, [url])

  // Derive MIME type from extension (best-effort)
  const lower = name.toLowerCase()
  const type = lower.endsWith('.mp4') ? 'video/mp4'
    : lower.endsWith('.webm') ? 'video/webm'
    : lower.endsWith('.ogg') || lower.endsWith('.ogv') ? 'video/ogg'
    : lower.endsWith('.mov') || lower.endsWith('.m4v') ? 'video/mp4'
    : lower.endsWith('.mkv') ? 'video/webm'
    : undefined

  return (
    <div className="w-full h-full flex items-center justify-center">
      <video
        ref={videoRef}
        controls
        preload="metadata"
        playsInline
        className="max-w-[min(1200px,98vw)] max-h-[calc(100vh-6rem)] rounded-md shadow"
        aria-label={`Video preview for ${name}`}
      >
        <source src={url} {...(type ? { type } : {})} />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}


