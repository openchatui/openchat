import { readFile, stat } from 'fs/promises'
import path from 'path'
import { FileManagementService } from '@/lib/server/file-management'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sanitize(input: string): string | null {
  return input.match(/^[a-zA-Z0-9._-]+$/) ? input : null
}

function resolveSafePath(segments: string[]): string | null {
  const base = path.resolve(FileManagementService.BASE_DIR)
  const joined = path.join(base, ...segments)
  const resolved = path.resolve(joined)
  if (!resolved.startsWith(base)) return null
  return resolved
}

export async function GET(_req: Request, context: any) {
  const rawSegments = context?.params?.path as string[] | undefined
  if (!rawSegments || rawSegments.length === 0) {
    return new Response('Not Found', { status: 404 })
  }
  const segments: string[] = []
  for (const seg of rawSegments) {
    const safe = sanitize(seg)
    if (!safe) return new Response('Not Found', { status: 404 })
    segments.push(safe)
  }

  const target = resolveSafePath(segments)
  if (!target) return new Response('Not Found', { status: 404 })

  try {
    const s = await stat(target)
    if (!s.isFile()) return new Response('Not Found', { status: 404 })
    const data = await readFile(target)
    const ext = target.toLowerCase().split('.').pop() || ''
    const type =
      ext === 'png' ? 'image/png' :
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'webp' ? 'image/webp' :
      ext === 'pdf' ? 'application/pdf' :
      ext === 'txt' ? 'text/plain; charset=utf-8' :
      'application/octet-stream'
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        'content-type': type,
        'cache-control': 'no-store',
      }
    })
  } catch {
    return new Response('Not Found', { status: 404 })
  }
}


