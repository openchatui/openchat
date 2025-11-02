import { readFile, stat } from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import { LOCAL_BASE_DIR } from '@/lib/modules/drive/providers/local.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sanitize(input: string): string | null {
  // Allow common filename characters including spaces and parentheses
  return input.match(/^[a-zA-Z0-9._()\- ]+$/) ? input : null
}

function resolveSafePath(segments: string[]): string | null {
  const base = path.resolve(LOCAL_BASE_DIR)
  const joined = path.join(base, ...segments)
  const resolved = path.resolve(joined)
  if (!resolved.startsWith(base)) return null
  return resolved
}

// Next.js dynamic API params are async; await them before use
export async function GET(_req: Request, context: { params: Promise<{ path?: string[] }> }) {
  const req = _req
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

  // New layout: allow nested paths and absolute DB paths (/data/files/<parent>/<name>)
  const candidates: (string | null)[] = []
  // If request includes absolute-ish DB path segments starting with data/files, strip and resolve under BASE_DIR
  if (segments.length >= 3 && segments[0] === 'data' && segments[1] === 'files') {
    candidates.push(resolveSafePath(segments.slice(2)))
  }
  // Try full segments as a relative path under BASE_DIR (e.g., <parent>/<name>)
  candidates.push(resolveSafePath(segments))
  // Legacy fallbacks by filename only (flat storage)
  const last = segments[segments.length - 1]
  candidates.push(resolveSafePath([last]))
  candidates.push(resolveSafePath(['files', last]))
  for (const cand of candidates) {
    if (!cand) continue
    try {
      const s = await stat(cand)
      if (!s.isFile()) continue
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
        ext === 'mp4' || ext === 'm4v' ? 'video/mp4' :
        ext === 'mov' ? 'video/quicktime' :
        ext === 'webm' ? 'video/webm' :
        ext === 'ogv' || ext === 'ogg' ? 'video/ogg' :
        ext === 'mkv' ? 'video/x-matroska' :
        'application/octet-stream'

      const range = req.headers.get('range')
      const fileSize = s.size
      const commonHeaders: Record<string, string> = {
        'content-type': type,
        'accept-ranges': 'bytes',
        'cache-control': 'no-store',
      }

      if (range) {
        // Parse Range: bytes=start-end
        const match = /bytes=(\d+)-(\d+)?/.exec(range)
        if (!match) {
          return new Response('Invalid Range', { status: 416 })
        }
        const start = parseInt(match[1]!, 10)
        const end = match[2] ? Math.min(parseInt(match[2]!, 10), fileSize - 1) : Math.min(start + 1024 * 1024 * 4 - 1, fileSize - 1) // 4MB default chunk
        if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
          return new Response('Invalid Range', { status: 416 })
        }
        const chunkSize = end - start + 1
        const stream = createReadStream(cand, { start, end })
        return new Response(stream as any, {
          status: 206,
          headers: {
            ...commonHeaders,
            'content-length': String(chunkSize),
            'content-range': `bytes ${start}-${end}/${fileSize}`,
          }
        })
      }

      // No range: stream entire file
      const fullStream = createReadStream(cand)
      return new Response(fullStream as any, {
        status: 200,
        headers: {
          ...commonHeaders,
          'content-length': String(fileSize),
          ...(ext === 'pdf' ? { 'content-disposition': `inline; filename="${last}"` } : {}),
        }
      })
    } catch {
      // try next candidate
    }
  }
  return new Response('Not Found', { status: 404 })
}


