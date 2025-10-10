'use client'

import { useEffect, useRef } from 'react'
import SwaggerUI from 'swagger-ui-dist/swagger-ui-es-bundle'
import './swagger-dark.css'

type ReactSwaggerProps = {
  spec: Record<string, unknown>
}

export default function ReactSwagger({ spec }: ReactSwaggerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Ensure base Swagger UI CSS is loaded without sourcemap to avoid 404s
    const linkEl = document.createElement('link')
    linkEl.rel = 'stylesheet'
    linkEl.href = '/api/assets/swagger-ui.css'
    // Insert at the start so that our dark overrides (already bundled) win in the cascade
    const head = document.head
    if (head.firstChild) head.insertBefore(linkEl, head.firstChild)
    else head.appendChild(linkEl)

    if (!containerRef.current) return () => {
      if (linkEl && linkEl.parentNode) linkEl.parentNode.removeChild(linkEl)
    }
    const ui = SwaggerUI({
      spec: spec as any,
      domNode: containerRef.current,
      deepLinking: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: -1,
    })

    return () => {
      if (linkEl && linkEl.parentNode) linkEl.parentNode.removeChild(linkEl)
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [spec])

  return <div ref={containerRef} className="swagger-ui" />
}


