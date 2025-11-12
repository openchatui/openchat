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
  const [showContent, setShowContent] = useState(false)
  const WHEEL_STEP = 0.1

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

  // Compute scale to fit width exactly
  const widthFitScale = useMemo(() => {
    if (!containerSize || !imageSize) return undefined
    const s = containerSize.width / imageSize.width
    if (!Number.isFinite(s) || s <= 0) return undefined
    return s
  }, [containerSize, imageSize])

  // Compute scale to fit height exactly
  const heightFitScale = useMemo(() => {
    if (!containerSize || !imageSize) return undefined
    const s = containerSize.height / imageSize.height
    if (!Number.isFinite(s) || s <= 0) return undefined
    return s
  }, [containerSize, imageSize])

  // Choose base fit depending on orientation: landscape -> width, portrait -> height
  const baseFitScale = useMemo(() => {
    if (!imageSize) return undefined
    const isPortrait = imageSize.height >= imageSize.width
    return (isPortrait ? heightFitScale : widthFitScale)
  }, [imageSize, widthFitScale, heightFitScale])

  const effectiveInitialScale = useMemo(() => {
    // Start from the base fit and then apply two "zoom clicks" in
    if (typeof baseFitScale === "number") return baseFitScale + 2 * WHEEL_STEP
    return typeof initialScale === "number" ? initialScale : 1
  }, [baseFitScale, initialScale])

  const effectiveMinScale = useMemo(() => {
    // Allow zooming out to exactly the base fit (so edges align), or to 1x for small images.
    if (typeof baseFitScale === "number") return Math.min(baseFitScale, 1)
    if (typeof minScale === "number") return minScale
    if (typeof initialScale === "number") return initialScale
    return 0.1
  }, [baseFitScale, initialScale, minScale])

  // Wait until we can determine fit vs not, so first paint is correct
  const ready = containerSize !== null && imageSize !== null

  // Avoid a single-frame flash of untransformed huge image by revealing content
  // one animation frame after everything is ready (transforms applied).
  useEffect(() => {
    if (!ready) {
      setShowContent(false)
      return
    }
    const id = requestAnimationFrame(() => setShowContent(true))
    return () => cancelAnimationFrame(id)
  }, [ready])

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ visibility: ready && showContent ? 'visible' : 'hidden' }}
    >
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
            <img
              src={src}
              alt={alt}
              className="select-none block"
              draggable={false}
            />
          </TransformComponent>
        </TransformWrapper>
      )}
    </div>
  )
}

export default ZoomableImage


