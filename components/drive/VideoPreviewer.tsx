"use client"
import { useRef, useEffect, useMemo, useState } from "react"

interface VideoPreviewerProps {
  url: string
  name: string
}

export default function VideoPreviewer({ url, name }: VideoPreviewerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    // Attempt to reset playback when URL changes
    el.pause()
    el.load()
    setErrored(false)
  }, [url])

  // Derive MIME type from extension (best-effort)
  const lower = name.toLowerCase()
  const type = useMemo(() => {
    if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return 'video/mp4'
    if (lower.endsWith('.mov')) return 'video/quicktime'
    if (lower.endsWith('.webm')) return 'video/webm'
    if (lower.endsWith('.ogg') || lower.endsWith('.ogv')) return 'video/ogg'
    // Avoid forcing incorrect types (e.g., mkv)
    return undefined
  }, [lower])

  // Basic support detection; iOS Safari is picky about codecs/containers
  const isProbablySupported = useMemo(() => {
    if (typeof document === 'undefined') return true
    if (!type) return true
    const test = document.createElement('video')
    const res = test.canPlayType(type)
    return res === 'probably' || res === 'maybe'
  }, [type])

  return (
    <div className="w-full h-full flex items-center justify-center">
      {(!isProbablySupported || errored) ? (
        <div className="flex flex-col items-center gap-3 p-4 text-center">
          <p className="text-sm text-muted-foreground">This video format may not be supported on your device.</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary"
          >
            Open video in a new tab
          </a>
        </div>
      ) : (
        <video
          key={url}
          ref={videoRef}
          controls
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
          className="max-w-[min(1200px,98vw)] max-h-[calc(100vh-6rem)] rounded-md shadow"
          aria-label={`Video preview for ${name}`}
          onError={() => setErrored(true)}
        >
          <source src={url} {...(type ? { type } : {})} />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  )
}


