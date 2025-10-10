"use server"

import ReactSwagger from "@/app/swagger/react-swagger"
import { getApiDocs } from "@/lib/api"

export default async function SwaggerPage() {
  const spec = await getApiDocs()
  return (
    <div className="p-4">
      <ReactSwagger spec={spec as unknown as Record<string, unknown>} />
    </div>
  )
}


