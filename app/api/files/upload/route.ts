import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { FileManagementService } from '@/lib/server/file-management'
import db from '@/lib/db'
import { FolderDbService } from '@/lib/server/file-management/folder-db.service'
import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'
import { Readable } from 'stream'
import Busboy from 'busboy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return new Promise<Response>((resolve) => {
    try {
      const headers = Object.fromEntries(req.headers as any)
      const bb = Busboy({ headers })

      let parent = ''
      const saved: { name: string; path: string }[] = []
      const inserts: Promise<void>[] = []
      const insertErrors: any[] = []

      bb.on('field', (name, val) => {
        if (name === 'parent') parent = String(val || '')
      })

      bb.on('file', (_name, fileStream, info) => {
        const filename = info.filename || 'file'
        // Always save into the flat data directory; ignore folder structure
        const targetDir = FileManagementService.BASE_DIR
        ensureDirSync(targetDir)
        const base = path.basename(filename)
        let finalPath = path.join(targetDir, base)
        // Deconflict on name collision by stamping
        if (fs.existsSync(finalPath)) {
          const ext = base.includes('.') ? '.' + base.split('.').pop() : ''
          const raw = ext ? base.slice(0, -ext.length) : base
          const stamped = `${raw}-${Date.now()}${ext}`
          finalPath = path.join(targetDir, stamped)
        }
        const writeStream = fs.createWriteStream(finalPath)
        fileStream.pipe(writeStream)
        writeStream.on('close', () => {
          const relativeFilePath = path.relative(FileManagementService.BASE_DIR, finalPath)
          saved.push({ name: path.basename(finalPath), path: relativeFilePath })

          // Prepare DB insert for this file
          const userId = session.user!.id as string
          const nowSec = Math.floor(Date.now() / 1000)
          // Store empty or relative path; consumer composes final path using filename
          const storedPath = ''

          const insertPromise = (async () => {
            try {
              // Resolve folder parent_id for meta
              let resolvedParentId: string | null = null
              if (!parent) {
                resolvedParentId = await FolderDbService.getRootFolderId(userId)
              } else {
                const rows = await db.$queryRaw<{ id: string }[]>`
                  SELECT id FROM "folder" WHERE user_id = ${userId} AND id = ${parent} LIMIT 1`
                if (rows && rows[0]?.id) {
                  resolvedParentId = rows[0].id
                }
              }

              const client: any = db as any
              if (client?.file?.create) {
                await client.file.create({
                  data: {
                    id: randomUUID(),
                    userId,
                    filename: path.basename(finalPath),
                    meta: { parent_id: resolvedParentId },
                    createdAt: nowSec,
                    updatedAt: nowSec,
                    path: storedPath,
                  },
                })
              } else {
                await db.$executeRaw`INSERT INTO "file" (id, user_id, filename, meta, created_at, updated_at, path)
                  VALUES (${randomUUID()}, ${userId}, ${path.basename(finalPath)}, ${JSON.stringify({ parent_id: resolvedParentId })}, ${nowSec}, ${nowSec}, ${storedPath})`
              }
            } catch (err) {
              insertErrors.push(err)
            }
          })()

          inserts.push(insertPromise)
        })
      })

      bb.on('finish', async () => {
        try {
          await Promise.all(inserts)
          if (insertErrors.length > 0) {
            return resolve(NextResponse.json({ ok: false, error: 'Failed to save some files to the database' }, { status: 500 }))
          }
          resolve(NextResponse.json({ ok: true, files: saved }))
        } catch (e) {
          resolve(NextResponse.json({ ok: false, error: 'Database error' }, { status: 500 }))
        }
      })

      bb.on('error', (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        resolve(NextResponse.json({ ok: false, error: message }, { status: 500 }))
      })

      const nodeStream = Readable.fromWeb(req.body as any)
      nodeStream.pipe(bb)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      resolve(NextResponse.json({ ok: false, error: message }, { status: 500 }))
    }
  })
}


