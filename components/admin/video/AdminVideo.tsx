"use client"

import { useEffect, useState } from "react"
import type { Session } from "next-auth"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { updateVideoConfig } from "@/lib/api/video"
import { OpenAIVideoConfigForm } from "@/components/admin/video/OpenAIVideoConfigForm"

type VideoProvider = 'openai'

interface AdminVideoProps {
  session: Session | null
  initialEnabled?: boolean
  initialProvider?: VideoProvider
  initialOpenAI?: { model?: string; size?: string; seconds?: number }
}

export function AdminVideo({ session, initialEnabled = false, initialProvider = 'openai', initialOpenAI }: AdminVideoProps) {
  const [enabled, setEnabled] = useState<boolean>(initialEnabled)
  const [provider, setProvider] = useState<VideoProvider>(initialProvider)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  useEffect(() => {
    setEnabled(initialEnabled)
    setProvider(initialProvider)
  }, [initialEnabled, initialProvider])

  const persistEnabled = async (next: boolean) => {
    try {
      setIsSaving(true)
      await updateVideoConfig({ enabled: Boolean(next) })
      setEnabled(Boolean(next))
      toast.success(Boolean(next) ? "Video enabled" : "Video disabled")
    } catch (e: any) {
      toast.error(e?.message || "Failed to update video setting")
    } finally {
      setIsSaving(false)
    }
  }

  const persistProvider = async (next: VideoProvider) => {
    try {
      setIsSaving(true)
      await updateVideoConfig({ provider: next })
      setProvider(next)
      toast.success("Video provider updated")
    } catch (e: any) {
      toast.error(e?.message || "Failed to update provider")
    } finally {
      setIsSaving(false)
    }
  }

  return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Video</h2>
          <p className="text-muted-foreground">Configure video generation providers and defaults.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Provider</CardTitle>
            <CardDescription>Select a provider and configure parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-end">
              <Switch id="video-enabled" checked={enabled} disabled={isSaving}
                onCheckedChange={(checked) => {
                  if (Boolean(checked) !== enabled) { void persistEnabled(Boolean(checked)) }
                }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="video-provider">Video Provider</Label>
                <p className="text-sm text-muted-foreground">Currently only OpenAI is supported.</p>
              </div>
              <Select value={provider} onValueChange={v => { setProvider(v as VideoProvider); void persistProvider(v as VideoProvider) }}>
                <SelectTrigger id="video-provider" className="min-w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {provider === 'openai' && (
          <Card>
            <CardHeader>
              <CardTitle>OpenAI Video</CardTitle>
              <CardDescription>Select model and defaults for Sora 2.</CardDescription>
            </CardHeader>
            <CardContent>
              <OpenAIVideoConfigForm initialModel={initialOpenAI?.model || 'sora-2-pro'} initialSize={initialOpenAI?.size || '1280x720'} initialSeconds={typeof initialOpenAI?.seconds === 'number' ? initialOpenAI!.seconds! : 4} />
            </CardContent>
          </Card>
        )}
      </div>
  )
}


