import { readFile } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sanitizeName(input: string): string | null {
  // Allow simple filenames like openai-1234-abcdef.png (png/webp/jpg/jpeg)
  const safe = input.match(/^[a-zA-Z0-9._-]+$/) ? input : null
  return safe
}

async function tryRead(paths: string[]): Promise<Buffer | null> {
  for (const p of paths) {
    try {
      const data = await readFile(p)
      return data
    } catch {}
  }
  return null
}

export async function GET(_req: Request, context: any) {
  const raw = context?.params?.name
  const name = typeof raw === 'string' ? sanitizeName(raw) : null
  if (!name) {
    return new Response('Not Found', { status: 404 })
  }

  // Resolve potential locations where the image might have been written at runtime
  const candidates = [
    path.join(process.cwd(), 'public', 'images', name),
    path.join(process.cwd(), '.next', 'standalone', 'public', 'images', name),
    path.join(process.cwd(), '.next', 'server', 'public', 'images', name),
  ]

  const file = await tryRead(candidates)
  if (!file) {
    return new Response('Not Found', { status: 404 })
  }

  // Basic content-type detection by extension
  const ext = name.toLowerCase().split('.').pop() || 'png'
  const type =
    ext === 'png' ? 'image/png' :
    ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
    ext === 'webp' ? 'image/webp' : 'application/octet-stream'

  const bytes = new Uint8Array(file)
  return new Response(bytes, {
    status: 200,
    headers: {
      'content-type': type,
      // Cache but allow revalidation
      'cache-control': 'public, max-age=31536000, immutable'
    }
  })
}


