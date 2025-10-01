"use client"

import type { Session } from "next-auth"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useDrive } from "@/hooks/useDrive"
 

interface AdminDriveProps {
  session: Session | null
  initialConfig?: {
    enabled: boolean
    workspace: { enabled: boolean; provider: 'local' | 'aws' | 'azure' }
    user: { enabled: boolean }
  }
  initialProvider?: "local" | "gdrive"
}

export function AdminDrive({ session, initialConfig, initialProvider }: AdminDriveProps) {
  const fallbackConfig = { enabled: false, workspace: { enabled: false, provider: 'local' as const }, user: { enabled: false } }
  const cfg = initialConfig ?? fallbackConfig
  const { enabled, workspace, user, isSaving, setEnabled, setWorkspaceEnabled, setWorkspaceProvider, setUserEnabled } = useDrive(cfg)
  return (
    <AdminSidebar session={session} activeTab="drive">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Drive</h2>
          <p className="text-muted-foreground">Enable Drive and configure workspace or user storage.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Drive Settings</CardTitle>
            <CardDescription>Enable Drive and choose storage options.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="drive-enabled">Enable Drive</Label>
                <p className="text-sm text-muted-foreground">Turn on file storage features.</p>
              </div>
              <Switch id="drive-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="workspace-enabled">Enable workspace level storage</Label>
                <p className="text-sm text-muted-foreground">Use a single provider for all users.</p>
              </div>
              <Switch id="workspace-enabled" checked={workspace.enabled} onCheckedChange={setWorkspaceEnabled} />
            </div>

            {workspace.enabled && (
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="workspace-provider">Workspace provider</Label>
                  <p className="text-sm text-muted-foreground">Select where file bytes are stored.</p>
                </div>
                <Select value={workspace.provider} onValueChange={(v) => setWorkspaceProvider(v as 'local' | 'aws' | 'azure')}>
                  <SelectTrigger id="workspace-provider" className="min-w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local (Filesystem)</SelectItem>
                    <SelectItem value="aws">AWS (S3)</SelectItem>
                    <SelectItem value="azure">Azure (Blob)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="user-enabled">Enable user level storage</Label>
                <p className="text-sm text-muted-foreground">User integration with Google Drive or Microsoft OneDrive.</p>
              </div>
              <Switch id="user-enabled" checked={user.enabled} onCheckedChange={setUserEnabled} />
            </div>
            <p className="text-xs text-muted-foreground">Settings save automatically.</p>
          </CardContent>
        </Card>
      </div>
    </AdminSidebar>
  )
}


