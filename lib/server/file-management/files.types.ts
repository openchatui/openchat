export interface FileEntry {
  id: string
  name: string
  path: string
  isDirectory: boolean
  size: number | null
  modifiedMs: number
  starred?: boolean
}


