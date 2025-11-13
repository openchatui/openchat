import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { LOCAL_BASE_DIR } from '@/lib/modules/drive/providers/local.service'
import db from '@/lib/db'
import { getRootFolderId } from '@/lib/modules/drive'
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
  console.log('[DEBUG] Upload POST received')
  const session = await auth()
  console.log('[DEBUG] Upload auth check:', { hasSession: !!session, userId: session?.user?.id })
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return new Promise<Response>((resolve) => {
    try {
      const headers = Object.fromEntries(req.headers as any)
      console.log('[DEBUG] Creating Busboy with headers:', { contentType: headers['content-type'] })
      const bb = Busboy({ headers })

      let parent = ''
      const saved: { id: string; name: string; path: string }[] = []
      const inserts: Promise<void>[] = []
      const insertErrors: any[] = []

      bb.on('field', (name, val) => {
        if (name === 'parent') parent = String(val || '')
      })

      bb.on('file', (_name, fileStream, info) => {
        console.log('[DEBUG] Busboy file event:', { name: _name, filename: info.filename })
        const filename = info.filename || 'file'
        const fileId = randomUUID()
        // Save under data/files/<parentId>/; targetDir updated once we know parent
        let targetDir = LOCAL_BASE_DIR
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
          const relativeFilePath = path.relative(LOCAL_BASE_DIR, finalPath)
          saved.push({ id: fileId, name: path.basename(finalPath), path: relativeFilePath })

          // Prepare DB insert for this file
          const userId = session.user!.id as string
          const nowSec = Math.floor(Date.now() / 1000)
          // Store DB path relative to project data directory (we use 'files' base)
          const storedPath = 'files'

          const insertPromise = (async () => {
            try {
              // Resolve folder parent_id
              let resolvedParentId: string | null = null
              if (!parent) {
                resolvedParentId = await getRootFolderId(userId)
              } else {
                const rows = await db.$queryRaw<{ id: string }[]>`
                  SELECT id FROM "folder" WHERE user_id = ${userId} AND id = ${parent} LIMIT 1`
                if (rows && rows[0]?.id) {
                  resolvedParentId = rows[0].id
                }
              }

              // Move file under the resolved parent directory if we didn't already
              if (resolvedParentId) {
                const parentDir = path.join(LOCAL_BASE_DIR, resolvedParentId)
                ensureDirSync(parentDir)
                const newPath = path.join(parentDir, path.basename(finalPath))
                if (newPath !== finalPath) {
                  fs.renameSync(finalPath, newPath)
                }
                finalPath = newPath
              }

              const client: any = db as any
              if (client?.file?.create) {
                await client.file.create({
                  data: {
                    id: fileId,
                    userId,
                    filename: path.basename(finalPath),
                    parentId: resolvedParentId,
                    meta: {},
                    createdAt: nowSec,
                    updatedAt: nowSec,
                    path: `/data/files/${resolvedParentId}/${path.basename(finalPath)}`,
                  },
                })
              } else {
                await db.$executeRaw`INSERT INTO "file" (id, user_id, filename, parent_id, meta, created_at, updated_at, path)
                  VALUES (${fileId}, ${userId}, ${path.basename(finalPath)}, ${resolvedParentId}, ${JSON.stringify({})}, ${nowSec}, ${nowSec}, ${`/data/files/${resolvedParentId}/${path.basename(finalPath)}`})`
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
          console.log('[DEBUG] Upload finish, saved files:', saved.length)
          console.log('[DEBUG] Waiting for DB inserts:', inserts.length)
          await Promise.all(inserts)
          console.log('[DEBUG] DB inserts complete, errors:', insertErrors.length)
          if (insertErrors.length > 0) {
            console.error('[DEBUG] Insert errors:', insertErrors)
            return resolve(NextResponse.json({ ok: false, error: 'Failed to save some files to the database' }, { status: 500 }))
          }
          console.log('[DEBUG] Returning success response with files:', saved)
          resolve(NextResponse.json({ ok: true, files: saved }))
        } catch (e) {
          console.error('[DEBUG] Finish handler error:', e)
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


