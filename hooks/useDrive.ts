import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { updateDriveConfigAction } from '@/actions/drive'

export type WorkspaceProvider = 'local' | 'aws' | 'azure'

export interface DriveConfigUI {
  enabled: boolean
  workspace: { enabled: boolean; provider: WorkspaceProvider }
  user: { enabled: boolean }
}

interface UseDriveState extends DriveConfigUI {
  isSaving: boolean
}

interface UseDriveApi extends UseDriveState {
  setEnabled: (enabled: boolean) => Promise<void>
  setWorkspaceEnabled: (enabled: boolean) => Promise<void>
  setWorkspaceProvider: (provider: WorkspaceProvider) => Promise<void>
  setUserEnabled: (enabled: boolean) => Promise<void>
}

export function useDrive(initialConfig: DriveConfigUI): UseDriveApi {
  const [state, setState] = useState<UseDriveState>({ ...initialConfig, isSaving: false })

  const setEnabled = useCallback(async (enabled: boolean) => {
    setState(prev => ({ ...prev, enabled, isSaving: true }))
    try {
      const fd = new FormData()
      fd.set('enabled', String(enabled))
      const res = await updateDriveConfigAction(fd)
      if (res?.status === 'success') toast.success('Drive settings saved')
      else toast.error(res?.message || 'Failed to save')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save')
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }, [])

  const setWorkspaceEnabled = useCallback(async (enabled: boolean) => {
    setState(prev => ({ ...prev, workspace: { ...prev.workspace, enabled }, isSaving: true }))
    try {
      const fd = new FormData()
      fd.set('workspaceEnabled', String(enabled))
      const res = await updateDriveConfigAction(fd)
      if (res?.status === 'success') toast.success('Workspace storage setting saved')
      else toast.error(res?.message || 'Failed to save')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save')
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }, [])

  const setWorkspaceProvider = useCallback(async (provider: WorkspaceProvider) => {
    setState(prev => ({ ...prev, workspace: { ...prev.workspace, provider }, isSaving: true }))
    try {
      const fd = new FormData()
      fd.set('workspaceProvider', provider)
      const res = await updateDriveConfigAction(fd)
      if (res?.status === 'success') toast.success('Workspace provider saved')
      else toast.error(res?.message || 'Failed to save')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save')
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }, [])

  const setUserEnabled = useCallback(async (enabled: boolean) => {
    setState(prev => ({ ...prev, user: { ...prev.user, enabled }, isSaving: true }))
    try {
      const fd = new FormData()
      fd.set('userEnabled', String(enabled))
      const res = await updateDriveConfigAction(fd)
      if (res?.status === 'success') toast.success('User storage setting saved')
      else toast.error(res?.message || 'Failed to save')
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


