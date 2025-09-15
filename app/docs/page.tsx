import { getApiDocs } from '@/lib/api/swagger'
import ReactSwagger from './react-swagger'

export default async function DocsPage() {
  const spec = await getApiDocs()
  return (
    <section className="container mx-auto p-4">
      <ReactSwagger spec={spec as Record<string, unknown>} />
    </section>
  )
}


