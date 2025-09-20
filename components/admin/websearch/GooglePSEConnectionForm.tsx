"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiKeyField } from "@/components/admin/ApiKeyField"
import { updateWebSearchConfigAction } from "@/actions/websearch"

interface GooglePSEConnectionFormProps {
  initialApiKey?: string
  initialEngineId?: string
  initialResultCount?: number
  initialDomainFilters?: string[]
}

export function GooglePSEConnectionForm({ initialApiKey = "", initialEngineId = "", initialResultCount = 5, initialDomainFilters = [] }: GooglePSEConnectionFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [apiKey, setApiKey] = useState(initialApiKey)
  const [engineId, setEngineId] = useState(initialEngineId)
  const [resultCount, setResultCount] = useState<number>(initialResultCount)
  const [domainsText, setDomainsText] = useState(initialDomainFilters.join('\n'))

  useEffect(() => { setIsLoading(false) }, [])

  // Debounced auto-save for non-API key fields (API key saved via ApiKeyField)
  useEffect(() => {
    if (isLoading) return
    setIsSaving(true)
    const handle = setTimeout(async () => {
      try {
        const parsedDomains = domainsText
          .split(/\r?\n|,/)
          .map(s => s.trim())
          .filter(Boolean)
        const payload = {
          websearch: {
            googlepse: {
              engineId,
              resultCount: Math.max(1, Math.min(50, Number(resultCount) || 5)),
              domainFilters: parsedDomains,
            }
          }
        }
        await updateWebSearchConfigAction(payload)
      } catch {
        // swallow; parent page shows global errors via hook if needed
      } finally {
        setIsSaving(false)
      }
    }, 600)
    return () => clearTimeout(handle)
  }, [engineId, resultCount, domainsText, isLoading])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ApiKeyField
          label="Google API Key"
          value={apiKey}
          onChange={setApiKey}
          onSave={async (val) => {
            const payload = { websearch: { googlepse: { apiKey: val } } }
            await updateWebSearchConfigAction(payload)
          }}
          isLoading={isLoading}
          placeholder="AIza..."
          initiallySaved={apiKey.length > 0}
        />
        <div className="space-y-2">
          <Label>Custom Search Engine ID</Label>
          <Input
            placeholder="cx or engine id"
            value={engineId}
            onChange={e => setEngineId(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Search result count (1-50)</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={resultCount}
            onChange={e => setResultCount(Number(e.target.value || 5))}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label>Domain filters (one per line or comma separated)</Label>
          <Textarea
            placeholder={"example.com\nsub.domain.com"}
            className="min-h-28"
            value={domainsText}
            onChange={e => setDomainsText(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      {isSaving && <p className="text-xs text-muted-foreground">Saving…</p>}
    </div>
  )
}



