"use client"

import type { Session } from "next-auth"
import { useState, useTransition } from "react"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateDriveProviderAction } from "@/actions/drive"
 

interface AdminDriveProps {
  session: Session | null
  initialProvider: "local" | "gdrive"
}

export function AdminDrive({ session, initialProvider }: AdminDriveProps) {
  const [provider, setProvider] = useState<"local" | "gdrive">(initialProvider)
  const [pending, startTransition] = useTransition()
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
              <Select
                value={provider}
                onValueChange={(v) => {
                  const next = v as "local" | "gdrive"
                  setProvider(next)
                  const fd = new FormData()
                  fd.set('provider', next)
                  startTransition(async () => {
                    await updateDriveProviderAction(fd)
                  })
                }}
              >
                <SelectTrigger id="drive-provider" className="min-w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local (Filesystem)</SelectItem>
                  <SelectItem value="gdrive">Google Drive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Switching providers will be managed server-side. Frontend remains unchanged.</p>
          </CardContent>
        </Card>
      </div>
    </AdminSidebar>
  )
}


