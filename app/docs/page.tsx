'use client'

import { useEffect, useRef } from 'react'
import SwaggerUI from 'swagger-ui-dist/swagger-ui-es-bundle'
import './swagger-ui.css'
import './swagger-dark.css'

export default function SwaggerDocsPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const anySwagger = SwaggerUI as unknown as (opts: any) => unknown
    anySwagger({
      url: '/api/docs',
      domNode: containerRef.current,
      deepLinking: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: -1,
    } as any)
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [])

  return <div ref={containerRef} className="swagger-ui" style={{ height: '100%' }} />
}


