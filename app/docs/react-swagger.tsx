'use client'

import { useEffect, useRef } from 'react'
import SwaggerUI from 'swagger-ui-dist/swagger-ui-es-bundle'
import 'swagger-ui-dist/swagger-ui.css'
import './swagger-dark.css'

type ReactSwaggerProps = {
  spec: Record<string, unknown>
}

export default function ReactSwagger({ spec }: ReactSwaggerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ui = SwaggerUI({
      spec: spec as any,
      domNode: containerRef.current,
      deepLinking: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: -1,
    })

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [spec])

  return <div ref={containerRef} className="swagger-ui" />
}


