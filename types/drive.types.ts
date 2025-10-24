export type WorkspaceProvider = 'local' | 'aws' | 'azure'

export interface DriveWorkspaceConfig {
  enabled: boolean
  provider: WorkspaceProvider
}

export interface DriveUserConfig {
  enabled: boolean
}

export interface DriveConfig {
  enabled: boolean
  workspace: DriveWorkspaceConfig
  user: DriveUserConfig
}

export interface UpdateDriveConfigInput {
  enabled?: boolean
  workspace?: { enabled?: boolean; provider?: WorkspaceProvider }
  user?: { enabled?: boolean }
}


