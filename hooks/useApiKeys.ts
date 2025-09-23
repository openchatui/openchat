"use client"

import { useCallback, useEffect, useState } from 'react'
import type { ApiKeyListItem, CreatedApiKey } from '@/lib/api/auth/api-auth.types'
import { toast } from 'sonner'
import { SETTINGS_MESSAGES, TOAST } from '@/constants/settings'

interface UseApiKeysState {
  keys: ApiKeyListItem[]
  isLoading: boolean
  isCreating: boolean
  deletingIds: Set<string>
}

export function useApiKeys() {
  const [state, setState] = useState<UseApiKeysState>({
    keys: [],
    isLoading: true,
    isCreating: false,
    deletingIds: new Set<string>(),
  })

  const loadKeys = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))
    try {
      const res = await fetch('/api/v1/api-keys', { cache: 'no-store' })
      if (!res.ok) {
        let message = 'Failed to load keys'
        try { const data = await res.json(); message = data?.error || message } catch {}
        throw new Error(message)
      }
      const data = await res.json() as { keys: ApiKeyListItem[] }
      setState(prev => ({ ...prev, keys: data.keys, isLoading: false }))
    } catch (e) {
      setState(prev => ({ ...prev, isLoading: false }))
      const message = e instanceof Error ? e.message : TOAST.ERROR_GENERIC
      toast.error(message)
    }
  }, [])

  useEffect(() => { loadKeys() }, [loadKeys])

  const createKey = useCallback(async (keyName: string) => {
    setState(prev => ({ ...prev, isCreating: true }))
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyName }),
      })
      if (!res.ok) {
        let message = 'Failed to create key'
        try { const data = await res.json(); message = data?.error || message } catch {}
        throw new Error(message)
      }
      const data = await res.json() as CreatedApiKey
      toast.success(TOAST.KEY_CREATED)
      await loadKeys()
      return data
    } catch (e) {
      const message = e instanceof Error ? e.message : TOAST.ERROR_GENERIC
      toast.error(message)
      return null
    } finally {
      setState(prev => ({ ...prev, isCreating: false }))
    }
  }, [loadKeys])

  const deleteKey = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, deletingIds: new Set(prev.deletingIds).add(id) }))
    try {
      const res = await fetch(`/api/v1/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) {
        let message = 'Failed to delete key'
        try { const data = await res.json(); message = data?.error || message } catch {}
        throw new Error(message)
      }
      toast.success(TOAST.KEY_DELETED)
      await loadKeys()
    } catch (e) {
      const message = e instanceof Error ? e.message : TOAST.ERROR_GENERIC
      toast.error(message)
    } finally {
      setState(prev => {
        const next = new Set(prev.deletingIds)
        next.delete(id)
        return { ...prev, deletingIds: next }
      })
    }
  }, [loadKeys])

  return {
    keys: state.keys,
    isLoading: state.isLoading,
    isCreating: state.isCreating,
    deletingIds: state.deletingIds,
    loadKeys,
    createKey,
    deleteKey,
  }
}


