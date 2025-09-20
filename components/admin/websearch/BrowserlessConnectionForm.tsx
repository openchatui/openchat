"use client"

import { useEffect, useState } from "react"
import { ApiKeyField } from "@/components/admin/ApiKeyField"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { updateWebSearchConfigAction } from "@/actions/websearch"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

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
  initialAdvanced?: {
    stealth?: boolean
    stealthRoute?: boolean
    blockAds?: boolean
    headless?: boolean
    locale?: string
    timezone?: string
    userAgent?: string
    route?: string
  }
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
  initialAdvanced,
}: BrowserlessConnectionFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [apiKey, setApiKey] = useState(initialApiKey)
  const [envKey, setEnvKey] = useState<string | null>(envApiKey)
  const [stealth, setStealth] = useState<boolean>(initialAdvanced?.stealth !== false)
  const [stealthRoute, setStealthRoute] = useState<boolean>(initialAdvanced?.stealthRoute === true)
  const [blockAds, setBlockAds] = useState<boolean>(initialAdvanced?.blockAds === true)
  const [headless, setHeadless] = useState<boolean>(initialAdvanced?.headless !== false)
  const [locale, setLocale] = useState<string>(initialAdvanced?.locale || "")
  const [timezone, setTimezone] = useState<string>(initialAdvanced?.timezone || "")
  const [userAgent, setUserAgent] = useState<string>(initialAdvanced?.userAgent || "")
  const [route, setRoute] = useState<string>(initialAdvanced?.route || "")

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

      <Accordion type="single" collapsible className="w-full pt-2">
        <AccordionItem value="advanced">
          <AccordionTrigger>Browserless advanced parameters</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <Label htmlFor="bl-stealth">Stealth evasions</Label>
                </div>
                <Switch id="bl-stealth" checked={stealth} onCheckedChange={async (v) => {
                  setStealth(Boolean(v))
                  await updateWebSearchConfigAction({ websearch: { browserless: { stealth: Boolean(v) } } })
                }} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <Label htmlFor="bl-stealth-route">Use stealth route</Label>
                </div>
                <Switch id="bl-stealth-route" checked={stealthRoute} onCheckedChange={async (v) => {
                  setStealthRoute(Boolean(v))
                  await updateWebSearchConfigAction({ websearch: { browserless: { stealthRoute: Boolean(v) } } })
                }} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <Label htmlFor="bl-block-ads">Block ads/trackers</Label>
                </div>
                <Switch id="bl-block-ads" checked={blockAds} onCheckedChange={async (v) => {
                  setBlockAds(Boolean(v))
                  await updateWebSearchConfigAction({ websearch: { browserless: { blockAds: Boolean(v) } } })
                }} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <Label htmlFor="bl-headless">Headless mode</Label>
                </div>
                <Switch id="bl-headless" checked={headless} onCheckedChange={async (v) => {
                  setHeadless(Boolean(v))
                  await updateWebSearchConfigAction({ websearch: { browserless: { headless: Boolean(v) } } })
                }} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bl-locale">Locale</Label>
                <Input id="bl-locale" placeholder="en-US" value={locale} onChange={(e) => setLocale(e.target.value)} onBlur={async () => {
                  await updateWebSearchConfigAction({ websearch: { browserless: { locale: locale || undefined } } })
                }} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bl-timezone">Timezone</Label>
                <Input id="bl-timezone" placeholder="America/Los_Angeles" value={timezone} onChange={(e) => setTimezone(e.target.value)} onBlur={async () => {
                  await updateWebSearchConfigAction({ websearch: { browserless: { timezone: timezone || undefined } } })
                }} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="bl-useragent">User-Agent override (optional)</Label>
                <Input id="bl-useragent" placeholder="Custom UA string" value={userAgent} onChange={(e) => setUserAgent(e.target.value)} onBlur={async () => {
                  await updateWebSearchConfigAction({ websearch: { browserless: { userAgent: userAgent || undefined } } })
                }} />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="bl-route">Route override (optional)</Label>
                <Input id="bl-route" placeholder="chromium or chromium/stealth" value={route} onChange={(e) => setRoute(e.target.value)} onBlur={async () => {
                  await updateWebSearchConfigAction({ websearch: { browserless: { route: route || undefined } } })
                }} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}


