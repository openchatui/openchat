import { readFile } from 'fs/promises'
import path from 'path'
import db from '@/lib/db'
import { LOCAL_BASE_DIR } from '@/lib/server/drive/providers/local.service'

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

export async function GET(_req: Request, context: { params: Promise<{ name?: string }> }) {
  const { name: rawName } = await context.params
  const raw = rawName
  const name = typeof raw === 'string' ? sanitizeName(raw) : null
  if (!name) {
    return new Response('Not Found', { status: 404 })
  }

  // Resolve potential locations where the image might have been written at runtime
  const candidates = [
    path.join(process.cwd(), 'data', 'images', name),
    path.join(process.cwd(), '.next', 'standalone', 'data', 'images', name),
    path.join(process.cwd(), '.next', 'server', 'data', 'images', name),
  ]

  // Try legacy/static locations first
  let file = await tryRead(candidates)
  if (!file) {
    // Fallback: resolve via DB file.path when stored under data/files/<parent>/<name>
    try {
      const rows = await db.$queryRaw<{ path: string }[]>`SELECT path FROM "file" WHERE filename = ${name} LIMIT 1`
      const p = rows && rows[0]?.path ? String(rows[0].path) : null
      if (p) {
        const tryPaths: string[] = []
        if (p.startsWith('/')) {
          tryPaths.push(path.join(process.cwd(), p.replace(/^\/+/, '')))
        }
        tryPaths.push(path.join(LOCAL_BASE_DIR, p))
        tryPaths.push(path.join(LOCAL_BASE_DIR, 'files', p))
        file = await tryRead(tryPaths)
      }
    } catch {}
  }
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


