"use client"

import { Session } from "next-auth"
import { AdminSidebar } from "../AdminSidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useAdminWebSearch } from "@/hooks/useAdminWebSearch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GooglePSEConnectionForm } from "./GooglePSEConnectionForm"
import { BrowserlessConnectionForm } from "./BrowserlessConnectionForm"

interface AdminWebSearchProps {
  session: Session | null
  initialChats?: any[]
  initialEnabled?: boolean
  initialProvider?: 'browserless' | 'googlepse'
  initialSystemPrompt?: string
  envSystemPrompt?: string
  initialGooglePse?: { apiKey?: string; engineId?: string; resultCount?: number; domainFilters?: string[] }
  initialBrowserless?: {
    apiKey?: string
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

export function AdminWebSearch({ session, initialChats = [], initialEnabled = false, initialProvider = 'browserless', initialSystemPrompt = '', envSystemPrompt = '', initialGooglePse, initialBrowserless }: AdminWebSearchProps) {
  const {
    enabled,
    setEnabled,
    systemPrompt,
    setSystemPrompt,
    provider,
    setProvider,
    isLoading,
    isSaving,
    error,
    persistEnabled,
    persistPrompt,
    persistProvider,
    resetToEnv,
  } = useAdminWebSearch({
    enabled: initialEnabled,
    systemPrompt: initialSystemPrompt,
    envSystemPrompt,
    provider: initialProvider,
    googlepse: initialGooglePse,
    browserless: initialBrowserless,
  })

  return (
    <AdminSidebar session={session} activeTab="websearch" initialChats={initialChats}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Web Search</h2>
          <p className="text-muted-foreground">Configure default behavior and the Browserless system prompt.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Web Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="websearch-enabled">Enable Web Search</Label>
                <p className="text-xs text-muted-foreground">Master switch to enable or disable web search functionality.</p>
              </div>
              <Switch
                id="websearch-enabled"
                checked={enabled}
                onCheckedChange={(v) => setEnabled(Boolean(v))}
                disabled={isLoading}
                onBlur={() => persistEnabled()}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="websearch-provider">Search provider</Label>
                <p className="text-xs text-muted-foreground">Choose which provider to use when Web Search is enabled.</p>
              </div>
              <Select
                value={provider}
                onValueChange={(val) => { setProvider(val as any); void persistProvider(val as any) }}
                disabled={isLoading}
              >
                <SelectTrigger id="websearch-provider" className="w-56">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browserless">Browserless</SelectItem>
                  <SelectItem value="googlepse">Google PSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {provider === 'browserless' && (
          <Card>
            <CardHeader>
              <CardTitle>Browserless Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <BrowserlessConnectionForm
                systemPrompt={systemPrompt}
                setSystemPrompt={setSystemPrompt}
                persistPrompt={persistPrompt}
                resetToEnv={resetToEnv}
                isSaving={isSaving}
                isGlobalLoading={isLoading}
                error={error}
                initialApiKey={initialBrowserless?.apiKey}
                initialAdvanced={{
                  stealth: initialBrowserless?.stealth,
                  stealthRoute: initialBrowserless?.stealthRoute,
                  blockAds: initialBrowserless?.blockAds,
                  headless: initialBrowserless?.headless,
                  locale: initialBrowserless?.locale,
                  timezone: initialBrowserless?.timezone,
                  userAgent: initialBrowserless?.userAgent,
                  route: initialBrowserless?.route,
                }}
              />
            </CardContent>
          </Card>
        )}

        {provider === 'googlepse' && (
          <Card>
            <CardHeader>
              <CardTitle>Google PSE Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <GooglePSEConnectionForm
                initialApiKey={initialGooglePse?.apiKey}
                initialEngineId={initialGooglePse?.engineId}
                initialResultCount={initialGooglePse?.resultCount}
                initialDomainFilters={initialGooglePse?.domainFilters}
              />
            </CardContent>
          </Card>
        )}

        {/* Prompt moved into BrowserlessConnectionForm when provider is browserless */}
      </div>
    </AdminSidebar>
  )
}



