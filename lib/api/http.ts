import { z } from "zod"

function getApiBase(): string {
  if (typeof window !== 'undefined') return ''
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || process.env.VERCEL_URL
  if (publicUrl && !publicUrl.includes('${')) {
    return publicUrl.startsWith('http') ? publicUrl : `https://${publicUrl}`
  }
  const port = process.env.PORT || '3000'
  return `http://localhost:${port}`
}

function resolveUrl(input: RequestInfo): RequestInfo {
  if (typeof input === 'string') {
    if (input.startsWith('http://') || input.startsWith('https://')) return input
    return `${getApiBase()}${input}`
  }
  return input
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // Server: use absolute base; Browser: keep relative for same-origin and cookie forwarding
  if (typeof window === 'undefined') {
    return `${getApiBase()}${path.startsWith('/') ? path : `/${path}`}`
  }
  return path
}

async function getServerCookieHeader(): Promise<Record<string, string>> {
  try {
    // Lazy import to avoid bundling in client
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { cookies } = require('next/headers') as { cookies: () => Promise<{ getAll: () => Array<{ name: string; value: string }> }> }
    const cookieStore = await cookies()
    const all = cookieStore.getAll()
    if (!Array.isArray(all) || all.length === 0) return {}
    const cookie = all.map(c => `${c.name}=${c.value}`).join('; ')
    return cookie ? { cookie } : {}
  } catch {
    return {}
  }
}

export async function httpFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  if (typeof window === 'undefined') {
    const serverCookies = await getServerCookieHeader()
    if (serverCookies.cookie && !headers.has('cookie')) headers.set('cookie', serverCookies.cookie)
  }
  return await fetch(resolveUrl(input), {
    ...init,
    headers,
    credentials: 'include',
  })
}

// Fetches and validates JSON response with a zod schema
export async function getJson<T>(
  input: RequestInfo,
  init: RequestInit | undefined,
  schema: z.ZodSchema<T>,
): Promise<T> {
  const res = await httpFetch(input, init)
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
  const res = await httpFetch(input, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`PUT failed: ${res.status} ${res.statusText}`)
  }
}

export async function deleteVoid(input: RequestInfo): Promise<void> {
  const res = await httpFetch(input, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(`DELETE failed: ${res.status} ${res.statusText}`)
  }
}

export async function postFormData(input: RequestInfo, formData: FormData): Promise<Response> {
  // Do not set content-type; let the browser/node set multipart boundaries
  return await httpFetch(input, { method: 'POST', body: formData })
}
