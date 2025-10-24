import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { updateDriveConfig } from '@/lib/api/drive'
import type { DriveConfig, WorkspaceProvider } from '@/types/drive.types'

// Using shared types from types/drive.types

interface UseDriveState extends DriveConfig {
  isSaving: boolean
}

interface UseDriveApi extends UseDriveState {
  setEnabled: (enabled: boolean) => Promise<void>
  setWorkspaceEnabled: (enabled: boolean) => Promise<void>
  setWorkspaceProvider: (provider: WorkspaceProvider) => Promise<void>
  setUserEnabled: (enabled: boolean) => Promise<void>
}

export function useDrive(initialConfig: DriveConfig): UseDriveApi {
  const [state, setState] = useState<UseDriveState>({ ...initialConfig, isSaving: false })

  const setEnabled = useCallback(async (enabled: boolean) => {
    setState(prev => ({ ...prev, enabled, isSaving: true }))
    try {
      await updateDriveConfig({ enabled })
      toast.success('Drive settings saved')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save')
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }, [])

  const setWorkspaceEnabled = useCallback(async (enabled: boolean) => {
    setState(prev => ({ ...prev, workspace: { ...prev.workspace, enabled }, isSaving: true }))
    try {
      await updateDriveConfig({ workspace: { enabled } })
      toast.success('Workspace storage setting saved')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save')
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }, [])

  const setWorkspaceProvider = useCallback(async (provider: WorkspaceProvider) => {
    setState(prev => ({ ...prev, workspace: { ...prev.workspace, provider }, isSaving: true }))
    try {
      await updateDriveConfig({ workspace: { provider } })
      toast.success('Workspace provider saved')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save')
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }, [])

  const setUserEnabled = useCallback(async (enabled: boolean) => {
    setState(prev => ({ ...prev, user: { ...prev.user, enabled }, isSaving: true }))
    try {
      await updateDriveConfig({ user: { enabled } })
      toast.success('User storage setting saved')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save')
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }, [])

  return {
    enabled: state.enabled,
    workspace: state.workspace,
    user: state.user,
    isSaving: state.isSaving,
    setEnabled,
    setWorkspaceEnabled,
    setWorkspaceProvider,
    setUserEnabled,
  }
}


