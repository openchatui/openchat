import { readFile, stat } from 'fs/promises'
import path from 'path'
import { FileManagementService } from '@/lib/server/file-management'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sanitize(input: string): string | null {
  // Allow common filename characters including spaces and parentheses
  return input.match(/^[a-zA-Z0-9._()\- ]+$/) ? input : null
}

function resolveSafePath(segments: string[]): string | null {
  const base = path.resolve(FileManagementService.BASE_DIR)
  const joined = path.join(base, ...segments)
  const resolved = path.resolve(joined)
  if (!resolved.startsWith(base)) return null
  return resolved
}

// Next.js dynamic API params are async; await them before use
export async function GET(_req: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path: rawSegments } = await context.params
  if (!rawSegments || rawSegments.length === 0) {
    return new Response('Not Found', { status: 404 })
  }
  const segments: string[] = []
  for (const seg of rawSegments) {
    const safe = sanitize(seg)
    if (!safe) return new Response('Not Found', { status: 404 })
    segments.push(safe)
  }

  // Support both flat storage and legacy data/files structure by filename
  const last = segments[segments.length - 1]
  const candidates: (string | null)[] = [
    resolveSafePath([last]),
    resolveSafePath(['files', last]),
  ]
  for (const cand of candidates) {
    if (!cand) continue
    try {
      const s = await stat(cand)
      if (!s.isFile()) continue
      const data = await readFile(cand)
      const ext = cand.toLowerCase().split('.').pop() || ''
      const type =
        ext === 'png' ? 'image/png' :
        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
        ext === 'gif' ? 'image/gif' :
        ext === 'svg' ? 'image/svg+xml' :
        ext === 'webp' ? 'image/webp' :
        ext === 'bmp' ? 'image/bmp' :
        ext === 'tiff' || ext === 'tif' ? 'image/tiff' :
        ext === 'heic' ? 'image/heic' :
        ext === 'heif' ? 'image/heif' :
        ext === 'avif' ? 'image/avif' :
        ext === 'pdf' ? 'application/pdf' :
        ext === 'txt' ? 'text/plain; charset=utf-8' :
        'application/octet-stream'
    return new Response(new Uint8Array(data), {
        status: 200,
        headers: {
          'content-type': type,
          'cache-control': 'no-store',
        ...(ext === 'pdf' ? { 'content-disposition': `inline; filename="${last}"` } : {}),
        }
      })
    } catch {
      // try next candidate
    }
  }
  return new Response('Not Found', { status: 404 })
}


