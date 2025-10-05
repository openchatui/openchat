"use client"

import { createContext, useContext, useMemo } from "react"

type IntegrationConfig = { enabled?: boolean } | undefined

interface IntegrationsContextValue {
  integrations: Record<string, IntegrationConfig>
  isEnabled: (key: string) => boolean
}

const IntegrationsContext = createContext<IntegrationsContextValue | null>(null)

interface IntegrationsProviderProps {
  initial: {
    integrations?: Record<string, IntegrationConfig>
  }
  children: React.ReactNode
}

export function IntegrationsProvider({ initial, children }: IntegrationsProviderProps) {
  const value = useMemo<IntegrationsContextValue>(() => {
    const integrations = initial.integrations ?? {}
    return {
      integrations,
      isEnabled: (key: string) => Boolean((integrations?.[key] as IntegrationConfig)?.enabled),
    }
  }, [initial.integrations])

  return (
    <IntegrationsContext.Provider value={value}>
      {children}
    </IntegrationsContext.Provider>
  )
}

export function useIntegrations() {
  const ctx = useContext(IntegrationsContext)
  if (!ctx) throw new Error("useIntegrations must be used within IntegrationsProvider")
  return ctx
}


