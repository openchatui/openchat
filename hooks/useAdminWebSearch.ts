"use client"

import { useCallback, useEffect, useState } from "react"
import { updateWebSearchConfig } from "@/lib/api/websearch"

interface WebSearchConfigResponse {
  websearch?: {
    ENABLED?: boolean | null
    ENABLED_BY_DEFAULT?: boolean | null
    SYSTEM_PROMPT?: string | null
    PROVIDER?: string | null
    googlepse?: {
      apiKey?: string
      engineId?: string
      resultCount?: number
      domainFilters?: string[]
    }
    ENV_SYSTEM_PROMPT?: string | null
  }
}

interface InitialWebSearchState {
  enabled: boolean
  systemPrompt: string
  envSystemPrompt: string
  provider: 'browserless' | 'googlepse'
  googlepse?: { apiKey?: string; engineId?: string; resultCount?: number; domainFilters?: string[] }
  browserless?: { apiKey?: string; ENV_API_KEY?: string | null }
}

export function useAdminWebSearch(initial?: InitialWebSearchState) {
  const [enabled, setEnabled] = useState<boolean>(false)
  const [systemPrompt, setSystemPrompt] = useState<string>("")
  const [envSystemPrompt, setEnvSystemPrompt] = useState<string>("")
  const [provider, setProvider] = useState<'browserless' | 'googlepse'>("browserless")
  const [gpApiKey, setGpApiKey] = useState<string>("")
  const [gpEngineId, setGpEngineId] = useState<string>("")
  const [gpResultCount, setGpResultCount] = useState<number>(5)
  const [gpDomainFilters, setGpDomainFilters] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initial) {
      setEnabled(Boolean(initial.enabled))
      setSystemPrompt(String(initial.systemPrompt || ''))
      setEnvSystemPrompt(String(initial.envSystemPrompt || ''))
      setProvider(initial.provider || 'browserless')
      if (initial.googlepse) {
        setGpApiKey(String(initial.googlepse.apiKey || ''))
        setGpEngineId(String(initial.googlepse.engineId || ''))
        setGpResultCount(Number.isFinite(initial.googlepse.resultCount as any) ? Number(initial.googlepse.resultCount) : 5)
        setGpDomainFilters(Array.isArray(initial.googlepse.domainFilters) ? (initial.googlepse.domainFilters as any[]).filter(v => typeof v === 'string') as string[] : [])
      }
    }
    setIsLoading(false)
  }, [])

  const persistPrompt = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      // Save provider-specific prompt to allow different prompts per provider.
      const payload = provider === 'browserless'
        ? { websearch: { browserless: { systemPrompt } } }
        : { websearch: { googlepse: { systemPrompt } } }
      await updateWebSearchConfig(payload)
    } catch (e: any) {
      setError(e?.message || 'Failed to save prompt')
    } finally {
      setIsSaving(false)
    }
  }, [systemPrompt, provider])

  const persistEnabled = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      await updateWebSearchConfig({ websearch: { ENABLED: enabled } })
    } catch (e: any) {
      setError(e?.message || 'Failed to save setting')
    } finally {
      setIsSaving(false)
    }
  }, [enabled])

  const persistProvider = useCallback(async (prov: 'browserless' | 'googlepse') => {
    setIsSaving(true)
    setError(null)
    try {
      await updateWebSearchConfig({ websearch: { PROVIDER: prov } })
    } catch (e: any) {
      setError(e?.message || 'Failed to save provider')
    } finally {
      setIsSaving(false)
    }
  }, [])

  const persistGooglePse = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      const payload = {
        websearch: {
          googlepse: {
            apiKey: gpApiKey,
            engineId: gpEngineId,
            resultCount: gpResultCount,
            domainFilters: gpDomainFilters,
          }
        }
      }
      await updateWebSearchConfig(payload)
    } catch (e: any) {
      setError(e?.message || 'Failed to save Google PSE config')
    } finally {
      setIsSaving(false)
    }
  }, [gpApiKey, gpEngineId, gpResultCount, gpDomainFilters])

  const resetToEnv = useCallback(async () => {
    setSystemPrompt(envSystemPrompt || '')
    // persist after setting
    setTimeout(() => { void persistPrompt() }, 0)
  }, [envSystemPrompt, persistPrompt])

  return {
    enabled,
    setEnabled,
    systemPrompt,
    setSystemPrompt,
    provider,
    setProvider,
    gpApiKey,
    setGpApiKey,
    gpEngineId,
    setGpEngineId,
    gpResultCount,
    setGpResultCount,
    gpDomainFilters,
    setGpDomainFilters,
    isLoading,
    isSaving,
    error,
    persistEnabled,
    persistPrompt,
    persistProvider,
    persistGooglePse,
    resetToEnv,
  }
}



