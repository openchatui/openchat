import 'server-only'
import { mkdir, readdir, stat, writeFile } from 'fs/promises'
import path from 'path'
import type { FileEntry } from './files.types'

export class FileManagementService {
  static readonly BASE_DIR = path.join(process.cwd(), 'data', 'files')

  private static sanitizeName(input: string): string | null {
    const safe = input.match(/^[a-zA-Z0-9._-]+$/) ? input : null
    return safe
  }

  private static async ensureDirExists(dirPath: string): Promise<void> {
    await mkdir(dirPath, { recursive: true })
  }

  private static resolveSafePath(relative: string): string {
    const target = path.join(FileManagementService.BASE_DIR, relative)
    const normalizedBase = path.resolve(FileManagementService.BASE_DIR)
    const normalizedTarget = path.resolve(target)
    if (!normalizedTarget.startsWith(normalizedBase)) {
      throw new Error('Invalid path')
    }
    return normalizedTarget
  }

  static async listDirectory(relative: string = ''): Promise<FileEntry[]> {
    const dir = FileManagementService.resolveSafePath(relative)
    await FileManagementService.ensureDirExists(dir)
    const entries = await readdir(dir, { withFileTypes: true })
    const results: FileEntry[] = []
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name)
      const s = await stat(entryPath)
      results.push({
        name: entry.name,
        path: path.join(relative, entry.name),
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

  static async saveFile(parentRelative: string, file: File): Promise<string> {
    if (!file || !file.name) throw new Error('No file provided')
    const safeName = FileManagementService.sanitizeName(file.name)
    if (!safeName) throw new Error('Invalid file name')

    const dir = FileManagementService.resolveSafePath(parentRelative)
    await FileManagementService.ensureDirExists(dir)
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
}

// Legacy compatibility: export functions mirroring the service
export const listDirectory = FileManagementService.listDirectory
export const saveFile = FileManagementService.saveFile


