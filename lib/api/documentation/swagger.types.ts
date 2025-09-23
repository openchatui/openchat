declare module 'swagger-ui-dist/swagger-ui-es-bundle' {
  type SwaggerUIBundleOptions = {
    spec?: Record<string, unknown>
    domNode: Element
    deepLinking?: boolean
    docExpansion?: 'list' | 'full' | 'none'
    defaultModelsExpandDepth?: number
  }

  export default function SwaggerUI(options: SwaggerUIBundleOptions): unknown
}


