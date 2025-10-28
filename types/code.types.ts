export type CodeProvider = 'pyodide' | 'jupyter'

export interface CodeConfig {
  enabled: boolean
  provider: CodeProvider
}


