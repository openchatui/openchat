"use server"

import ReactSwagger from "@/app/swagger/react-swagger"
import { SwaggerService } from "@/lib"

export default async function SwaggerPage() {
  const spec = await SwaggerService.getApiDocs()
  return (
    <div className="p-4">
      <ReactSwagger spec={spec as unknown as Record<string, unknown>} />
    </div>
  )
}


