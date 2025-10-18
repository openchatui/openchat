import { z } from "zod"

// Fetches and validates JSON response with a zod schema
export async function getJson<T>(
  input: RequestInfo,
  init: RequestInit | undefined,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const res = await fetch(input, { ...init, credentials: "include" })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  const raw: unknown = await res.json().catch(() => {
    throw new Error("Failed to parse JSON response")
  })
  
  try {
    return schema.parse(raw)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n')
      throw new Error(`Schema validation failed:\n${issues}`)
    }
    throw error
  }
}

// Sends JSON data with PUT method
export async function putJson(input: RequestInfo, body: unknown): Promise<void> {
  const res = await fetch(input, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  })
  if (!res.ok) {
    throw new Error(`PUT failed: ${res.status} ${res.statusText}`)
  }
}
