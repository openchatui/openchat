"use client"

import type { Session } from "next-auth"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface AdminDriveProps {
  session: Session | null
  initialProvider: "local" | "gdrive"
}

export function AdminDrive({ session, initialProvider }: AdminDriveProps) {
  return (
    <AdminSidebar session={session} activeTab="drive">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Drive</h2>
          <p className="text-muted-foreground">Configure storage provider and integration for Drive.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Storage Provider</CardTitle>
            <CardDescription>Select where file bytes are stored. UI and DB listing remain unchanged.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="drive-provider">Active Provider</Label>
                <p className="text-sm text-muted-foreground">This reflects the server-side configuration.</p>
              </div>
              <Select value={initialProvider} disabled>
                <SelectTrigger id="drive-provider" className="min-w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local (filesystem)</SelectItem>
                  <SelectItem value="gdrive">Google Drive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Switching providers will be managed server-side. Frontend remains unchanged.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Drive Integration</CardTitle>
            <CardDescription>Connect your Google account to enable Google Drive as a storage provider.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Setup</Badge>
              <span className="text-sm text-muted-foreground">Use Integrations to connect Google with offline access.</span>
            </div>
            <div>
              <Link href="/settings/integrations" className="text-sm underline">Open Settings → Integrations</Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Implementation details</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Listings come from the database. Files/folders store provider metadata in JSON fields.</p>
            <Separator />
            <ul className="list-disc pl-5 space-y-1">
              <li>Local saves under <code>data/files</code>; Google Drive uploads via Drive API.</li>
              <li>Downloads and previews are proxied server-side; no frontend changes.</li>
              <li>Mixed mode supported per item; migrations optional.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminSidebar>
  )
}


