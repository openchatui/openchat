"use client"

import { useEffect, useState } from "react"
import { ApiKeyField } from "@/components/admin/ApiKeyField"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { updateWebSearchConfigAction } from "@/actions/websearch"

interface BrowserlessConnectionFormProps {
  systemPrompt?: string
  setSystemPrompt?: (v: string) => void
  persistPrompt?: () => void
  resetToEnv?: () => void
  isSaving?: boolean
  isGlobalLoading?: boolean
  error?: string | null
  initialApiKey?: string
  envApiKey?: string | null
}

export function BrowserlessConnectionForm({
  systemPrompt,
  setSystemPrompt,
  persistPrompt,
  resetToEnv,
  isSaving,
  isGlobalLoading,
  error,
  initialApiKey = "",
  envApiKey = null,
}: BrowserlessConnectionFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [apiKey, setApiKey] = useState(initialApiKey)
  const [envKey, setEnvKey] = useState<string | null>(envApiKey)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  // API key saved via ApiKeyField

  return (
    <div className="space-y-4">
      <ApiKeyField
        label="Browserless API Key"
        value={apiKey}
        onChange={setApiKey}
        onSave={async (val) => {
          await updateWebSearchConfigAction({ websearch: { browserless: { apiKey: val } } })
        }}
        isLoading={isLoading}
        placeholder="bl_..."
        initiallySaved={apiKey.length > 0}
      />
      {envKey && (
        <p className="text-xs text-muted-foreground">ENV key present; DB key overrides if set.</p>
      )}

      {typeof systemPrompt === 'string' && setSystemPrompt && (
        <div className="space-y-2 pt-2">
          <Label htmlFor="browserless-system-prompt">Browserless System Prompt</Label>
          <Textarea
            id="browserless-system-prompt"
            className="w-full max-w-5xl min-h-40"
            placeholder="Guidance for browsing behavior when tools are enabled"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            onBlur={() => persistPrompt && persistPrompt()}
            disabled={Boolean(isGlobalLoading)}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => resetToEnv && resetToEnv()}
              disabled={Boolean(isSaving) || Boolean(isGlobalLoading)}
            >
              Reset to env default
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  )
}


