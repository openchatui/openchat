import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listFoldersByParent, listFilesByParent, getFolderNameById } from '@/lib/modules/drive'
import { LOCAL_BASE_DIR } from '@/lib/modules/drive/providers/local.service'
import path from 'path'
import os from 'os'
import { mkdtemp, mkdir, copyFile, stat, rm } from 'fs/promises'
import archiver from 'archiver'
import { PassThrough, Readable } from 'stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * @swagger
 * /api/v1/drive/folder/download:
 *   get:
 *     tags: [Drive]
 *     summary: Download a folder (and subfolders) as a ZIP archive
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Folder ID to download
 *     responses:
 *       200:
 *         description: ZIP archive of the requested folder
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Missing or invalid id
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to create zip
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath)
    return s.isFile()
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const folderId = searchParams.get('id') || ''
  if (!folderId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const userId = session.user.id
    const rootName = (await getFolderNameById(userId, folderId)) || 'folder'

    // Prepare temp workspace
    const tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'oc-zip-'))
    const buildRoot = path.join(tmpRoot, rootName)
    await mkdir(buildRoot, { recursive: true })

    // Traverse folders BFS and copy discovered files into temp structure
    const queue: { id: string; rel: string }[] = [{ id: folderId, rel: rootName }]
    while (queue.length > 0) {
      const { id, rel } = queue.shift()!
      const subfolders = await listFoldersByParent(userId, id)
      for (const f of subfolders) {
        const nextRel = path.join(rel, f.name)
        await mkdir(path.join(tmpRoot, nextRel), { recursive: true })
        queue.push({ id: f.id, rel: nextRel })
      }
      const files = await listFilesByParent(userId, id)
      for (const file of files) {
        const candidates = [] as string[]
        // If DB path is absolute (/data/files/...), try it directly
        if (file.path.startsWith('/')) {
          candidates.push(path.join(process.cwd(), file.path.replace(/^\/+/, '')))
        }
        // Relative under BASE_DIR
        candidates.push(path.join(LOCAL_BASE_DIR, file.path))
        candidates.push(path.join(LOCAL_BASE_DIR, 'files', file.path))
        // Fallbacks by filename only
        candidates.push(path.join(LOCAL_BASE_DIR, file.name))
        candidates.push(path.join(LOCAL_BASE_DIR, 'files', file.name))
        let src: string | null = null
        for (const cand of candidates) {
          if (await pathExists(cand)) { src = cand; break }
        }
        if (!src) {
          // Skip missing content gracefully
          continue
        }
        const dest = path.join(tmpRoot, rel, file.name)
        await mkdir(path.dirname(dest), { recursive: true })
        await copyFile(src, dest)
      }
    }

    // Stream zip via archiver (no system zip dependency)
    const stream = new PassThrough()
    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.on('error', async (err: any) => {
      stream.destroy(err)
      await rm(tmpRoot, { recursive: true, force: true })
    })
    archive.on('end', async () => {
      await rm(tmpRoot, { recursive: true, force: true })
    })
    archive.directory(buildRoot, false)
    archive.pipe(stream)
    void archive.finalize()

    return new Response(Readable.toWeb(stream) as unknown as BodyInit, {
      status: 200,
      headers: {
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="${rootName}.zip"`,
        'cache-control': 'no-store',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create zip' }, { status: 500 })
  }
}


