import 'server-only'
import path from 'path'
import { mkdir, readdir, stat, writeFile } from 'fs/promises'
import type { FileEntry } from '@/lib/modules/drive/types'

export const LOCAL_BASE_DIR = path.join(process.cwd(), 'data', 'files')

function sanitizeName(input: string): string | null {
  const safe = input.match(/^[a-zA-Z0-9._()-]+$/) ? input : null
  return safe
}

async function ensureDirExists(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true })
}

function resolveSafePath(relative: string): string {
  const target = path.join(LOCAL_BASE_DIR, relative)
  const normalizedBase = path.resolve(LOCAL_BASE_DIR)
  const normalizedTarget = path.resolve(target)
  if (!normalizedTarget.startsWith(normalizedBase)) {
    throw new Error('Invalid path')
  }
  return normalizedTarget
}

export async function listDirectory(relative: string = ''): Promise<FileEntry[]> {
  const dir = resolveSafePath(relative)
  await ensureDirExists(dir)
  const entries = await readdir(dir, { withFileTypes: true })
  const results: FileEntry[] = []
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    const s = await stat(entryPath)
    const relPath = path.join(relative, entry.name)
    results.push({
      id: relPath,
      name: entry.name,
      path: relPath,
      isDirectory: entry.isDirectory(),
      size: entry.isDirectory() ? null : s.size,
      modifiedMs: s.mtimeMs,
    })
  }
  results.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return results
}

export async function saveFile(parentRelative: string, file: File): Promise<string> {
  if (!file || !file.name) throw new Error('No file provided')
  const safeName = sanitizeName(file.name)
  if (!safeName) throw new Error('Invalid file name')

  const dir = resolveSafePath(parentRelative)
  await ensureDirExists(dir)
  let targetPath = path.join(dir, safeName)

  try {
    const existing = await stat(targetPath)
    if (existing) {
      const ext = safeName.includes('.') ? `.${safeName.split('.').pop()}` : ''
      const base = ext ? safeName.slice(0, -(ext.length)) : safeName
      const stamped = `${base}-${Date.now()}${ext}`
      targetPath = path.join(dir, stamped)
    }
  } catch {}

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await writeFile(targetPath, buffer)
  return path.basename(targetPath)
}

// Skeletons for future local operations (to be implemented later)
export async function moveItem(): Promise<never> { throw new Error('Not implemented') }
export async function trashItem(): Promise<never> { throw new Error('Not implemented') }
export async function restoreItem(): Promise<never> { throw new Error('Not implemented') }
export async function createFolder(): Promise<never> { throw new Error('Not implemented') }


