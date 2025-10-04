"use client"

import { useEffect, useState } from "react"
import type { Session } from "next-auth"
import { AdminSidebar } from "@/components/admin/AdminSidebar"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { updateConnectionsConfig } from "@/actions/connections"

import { OpenAIImageConnectionForm } from "@/components/admin/image/OpenAIImageConnectionForm"
import { updateImageConfigAction } from "@/actions/image"
import { toast } from "sonner"

interface AdminImageProps {
  session: Session | null
  initialChats?: any[]
  initialProvider?: 'openai' | 'comfyui' | 'automatic1111'
  initialEnabled?: boolean
}

export function AdminImage({ session, initialChats = [], initialProvider = 'openai', initialEnabled = false }: AdminImageProps) {
  const [provider, setProvider] = useState<'openai' | 'comfyui' | 'automatic1111'>(initialProvider)
  const [enabled, setEnabled] = useState<boolean>(initialEnabled)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  useEffect(() => {
    setProvider(initialProvider)
    setEnabled(initialEnabled)
  }, [initialProvider, initialEnabled])

  const persistProvider = async (nextProvider: 'openai' | 'comfyui' | 'automatic1111') => {
    try {
      setIsSaving(true)
      await updateImageConfigAction({ provider: nextProvider })
      setProvider(nextProvider)
      toast.success("Image provider updated")
    } catch (e: any) {
      toast.error(e?.message || "Failed to update image provider")
    } finally {
      setIsSaving(false)
    }
  }

  const persistEnabled = async (nextEnabled: boolean) => {
    try {
      setIsSaving(true)
      // For now, image uses OpenAI provider when enabled
      if (provider === 'openai') {
        await updateConnectionsConfig({ connections: { openai: { enable: nextEnabled } } })
      }
      setEnabled(nextEnabled)
      toast.success(nextEnabled ? "Image generation enabled" : "Image generation disabled")
    } catch (e: any) {
      toast.error(e?.message || "Failed to update image setting")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminSidebar session={session} activeTab="image" initialChats={initialChats}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Image</h2>
          <p className="text-muted-foreground">Configure image generation providers and defaults.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Provider</CardTitle>
            <CardDescription>Select a provider and configure credentials.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-end">
              <Switch id="image-enabled" checked={enabled} disabled={isSaving}
                onCheckedChange={(checked) => { if (Boolean(checked) !== enabled) { void persistEnabled(Boolean(checked)) } }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="image-provider">Image Provider</Label>
                <p className="text-sm text-muted-foreground">OpenAI, ComfyUI, or Automatic1111</p>
              </div>
              <Select value={provider} onValueChange={v => { setProvider(v as any); void persistProvider(v as any) }}>
                <SelectTrigger id="image-provider" className="min-w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="comfyui">ComfyUI</SelectItem>
                  <SelectItem value="automatic1111">Automatic1111</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {provider === 'openai' && (
          <Card>
            <CardHeader>
              <CardTitle>OpenAI Connection</CardTitle>
              <CardDescription>Set API details, choose model and image size.</CardDescription>
            </CardHeader>
            <CardContent>
              <OpenAIImageConnectionForm />
            </CardContent>
          </Card>
        )}

        {provider === 'comfyui' && (
          <Card>
            <CardHeader>
              <CardTitle>ComfyUI</CardTitle>
              <CardDescription>Configuration coming soon.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Support for ComfyUI configuration will be added here.</p>
            </CardContent>
          </Card>
        )}

        {provider === 'automatic1111' && (
          <Card>
            <CardHeader>
              <CardTitle>Automatic1111</CardTitle>
              <CardDescription>Configuration coming soon.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Support for Automatic1111 configuration will be added here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminSidebar>
  )
}


