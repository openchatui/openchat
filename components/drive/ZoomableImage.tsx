"use client"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"

interface ZoomableImageProps {
  src: string
  alt: string
  initialScale?: number
  minScale?: number
  maxScale?: number
}

export function ZoomableImage({ src, alt, initialScale = 0.75, minScale = initialScale, maxScale = 8 }: ZoomableImageProps) {
  return (
    <div className="w-full h-full overflow-hidden">
      <TransformWrapper
        initialScale={initialScale}
        minScale={minScale}
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
          contentClass="w-full h-full flex items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-w-full max-h-full object-contain select-none" draggable={false} />
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}

export default ZoomableImage


