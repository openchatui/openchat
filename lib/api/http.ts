import { z } from "zod"

function getApiBase(): string {
  if (typeof window !== 'undefined') return ''
  
  // For server-side calls in Docker/reverse proxy mode, use localhost
  // trustHost: true tells Auth.js to trust X-Forwarded-* headers,
  // and we explicitly forward cookies in httpFetch() to maintain auth
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
    if (process.env.DEBUG_AUTH === 'true') {
      console.log('[httpFetch] Server-side request:', {
        url: typeof input === 'string' ? input : 'Request object',
        hasCookies: !!serverCookies.cookie,
        cookieLength: serverCookies.cookie?.length || 0,
      })
    }
    if (serverCookies.cookie && !headers.has('cookie')) {
      headers.set('cookie', serverCookies.cookie)
    }
    
    // When behind a reverse proxy, forward the external host for Auth.js validation
    // Auth.js with trustHost:true will validate against these headers
    const externalUrl = process.env.AUTH_URL 
    if (externalUrl) {
      try {
        const url = new URL(externalUrl)
        // Set Host header to match external domain (critical for Auth.js session validation)
        if (!headers.has('host')) {
          headers.set('host', url.host)
        }
        // Also set x-forwarded-* headers for proper proxy handling
        if (!headers.has('x-forwarded-host')) {
          headers.set('x-forwarded-host', url.host)
        }
        if (!headers.has('x-forwarded-proto')) {
          headers.set('x-forwarded-proto', url.protocol.replace(':', ''))
        }
        if (!headers.has('x-forwarded-for')) {
          headers.set('x-forwarded-for', '127.0.0.1')
        }
        
        // Debug logging for Docker troubleshooting
        if (process.env.DEBUG_AUTH === 'true') {
          const cookieHeader = headers.get('cookie') || '';
        }
      } catch (err) {
        console.error('[httpFetch] Failed to parse AUTH_URL:', externalUrl, err)
      }
    }
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
