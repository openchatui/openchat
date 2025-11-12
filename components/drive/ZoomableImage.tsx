"use client"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"
import { useEffect, useMemo, useRef, useState } from "react"

interface ZoomableImageProps {
  src: string
  alt: string
  initialScale?: number
  minScale?: number
  maxScale?: number
}

export function ZoomableImage({ src, alt, initialScale, minScale, maxScale = 8 }: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)

  // Measure the container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setContainerSize({ width: rect.width, height: rect.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      ro.disconnect()
    }
  }, [])

  // Preload image to read natural dimensions
  useEffect(() => {
    if (!src) return
    let cancelled = false
    const img = new Image()
    img.decoding = "async"
    img.onload = () => {
      if (cancelled) return
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = src
    return () => {
      cancelled = true
    }
  }, [src])

  const fitScale = useMemo(() => {
    if (!containerSize || !imageSize) return undefined
    const wScale = containerSize.width / imageSize.width
    const hScale = containerSize.height / imageSize.height
    const s = Math.min(wScale, hScale)
    if (!Number.isFinite(s) || s <= 0) return undefined
    return s
  }, [containerSize, imageSize])

  const shouldAutoFit = useMemo(() => {
    return typeof fitScale === "number" && fitScale < 1
  }, [fitScale])

  const effectiveInitialScale = useMemo(() => {
    // Auto-fit very large images; otherwise honor provided value or default to 1
    if (shouldAutoFit && typeof fitScale === "number") return fitScale
    return typeof initialScale === "number" ? initialScale : 1
  }, [fitScale, initialScale, shouldAutoFit])

  const effectiveMinScale = useMemo(() => {
    // When auto-fitting, keep min at fit scale to avoid zooming out past screen
    if (shouldAutoFit && typeof fitScale === "number") return fitScale
    if (typeof minScale === "number") return minScale
    if (typeof initialScale === "number") return initialScale
    return 0.1
  }, [fitScale, initialScale, minScale, shouldAutoFit])

  // Wait until we can determine fit vs not, so first paint is correct
  const ready = containerSize !== null && imageSize !== null

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      {ready && (
        <TransformWrapper
          initialScale={effectiveInitialScale}
          minScale={effectiveMinScale}
          maxScale={maxScale}
          wheel={{ step: 0.1, disabled: false }}
          pinch={{ disabled: false }}
          doubleClick={{ disabled: false, step: 0.8 }}
          limitToBounds
          centerOnInit
          panning={{ velocityDisabled: true }}
        >
          <TransformComponent
            wrapperClass="w-full h-full"
            wrapperStyle={{ width: '100%', height: '100%' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="select-none" draggable={false} />
          </TransformComponent>
        </TransformWrapper>
      )}
    </div>
  )
}

export default ZoomableImage


