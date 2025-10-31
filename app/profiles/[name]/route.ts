import { readFile } from 'fs/promises'
import path from 'path'

function sanitizeName(input: string): string | null {
  const s = String(input || '').trim()
  if (!s) return null
  // Basic traversal protection
  if (s.includes('..') || s.includes('/') || s.includes('\\')) return null
  return s
}

async function tryRead(paths: string[]): Promise<Buffer | null> {
  for (const p of paths) {
    try {
      const b = await readFile(p)
      if (b && b.length > 0) return b
    } catch {}
  }
  return null
}

export async function GET(_req: Request, context: { params: Promise<{ name?: string }> }) {
  const { name: rawName } = await context.params
  const name = typeof rawName === 'string' ? sanitizeName(rawName) : null
  if (!name) return new Response('Not Found', { status: 404 })

  // Resolve common locations that might be used in different build modes
  const candidates = [
    path.join(process.cwd(), 'public', 'profiles', name),
    path.join(process.cwd(), '.next', 'standalone', 'public', 'profiles', name),
    path.join(process.cwd(), '.next', 'server', 'public', 'profiles', name),
  ]

  const file = await tryRead(candidates)
  if (!file) return new Response('Not Found', { status: 404 })

  const ext = name.toLowerCase().split('.').pop() || 'png'
  const type =
    ext === 'png' ? 'image/png' :
    ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
    ext === 'webp' ? 'image/webp' :
    ext === 'gif' ? 'image/gif' : 'application/octet-stream'

  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      'content-type': type,
      'cache-control': 'public, max-age=31536000, immutable'
    }
  })
}


