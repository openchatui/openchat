"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogHeader, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { Group } from "@/lib/server/group-management/group.types"

type Model = {
  id: string
  name?: string
  is_active?: boolean
  read?: { group_ids: string[]; user_ids: string[] }
  write?: { group_ids: string[]; user_ids: string[] }
}

interface ModelsDialogContentProps {
  group: Group | null
  onSave?: (modelPermissions: Record<string, { read: boolean; write: boolean }>) => void
  onClose?: () => void
}

export function ModelsDialogContent({ group, onSave, onClose }: ModelsDialogContentProps) {
  const [models, setModels] = useState<Model[]>([])
  const [selection, setSelection] = useState<Record<string, { read: boolean; write: boolean }>>({})

  useEffect(() => {
    if (!group) return
    let mounted = true
    ;(async () => {
      try {
        // Use existing public API route that returns models for the authenticated user
        const res = await fetch('/api/v1/models')
        if (!res.ok) return
        const payload = await res.json()
        const data: Model[] = Array.isArray(payload?.models) ? payload.models : []
        if (!mounted) return
        // Filter to active models and non-hidden per server logic
        const active = (data || []).filter((m: any) => (m.isActive || m.is_active) && !m.meta?.hidden)
        setModels(active)
        const map: Record<string, { read: boolean; write: boolean }> = {}
        data.forEach((m) => {
          const ac: any = (m as any).accessControl || (m as any).access_control || {}
          const readGroups: string[] = Array.isArray(ac?.read?.group_ids) ? ac.read.group_ids : []
          const writeGroups: string[] = Array.isArray(ac?.write?.group_ids) ? ac.write.group_ids : []
          map[m.id] = {
            read: readGroups.includes(group.id),
            write: writeGroups.includes(group.id),
          }
        })
        setSelection(map)
      } catch (e) {
        // ignore fetch errors for now
        console.error(e)
      }
    })()
    return () => { mounted = false }
  }, [group])

  if (!group) return null

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Models access</DialogTitle>
        <DialogDescription>Grant read/write access for models to this group.</DialogDescription>
      </DialogHeader>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
        {models.length === 0 ? (
          <div className="text-sm text-muted-foreground">No active models found</div>
        ) : (
          models.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <div className="truncate">{m.name || m.id}</div>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!!selection[m.id]?.read}
                    onCheckedChange={(v) => setSelection((prev) => {
                      const prevSel = prev[m.id] || { read: false, write: false }
                      const read = !!v
                      // if user unchecks read while write was enabled, clear write as well
                      const write = read ? prevSel.write : false
                      return { ...prev, [m.id]: { ...prevSel, read, write } }
                    })}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Grant read access to ${m.name || m.id}`}
                  />
                  <span className="text-sm">Read</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!!selection[m.id]?.write}
                    onCheckedChange={(v) => setSelection((prev) => {
                      const prevSel = prev[m.id] || { read: false, write: false }
                      const write = !!v
                      // when write is enabled, ensure read is also enabled
                      const read = write ? true : prevSel.read
                      return { ...prev, [m.id]: { ...prevSel, read, write } }
                    })}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Grant write access to ${m.name || m.id}`}
                  />
                  <span className="text-sm">Write</span>
                </label>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Provide the selection as a hidden input so parent forms can submit it */}
      <input type="hidden" name="modelPermissions" value={JSON.stringify(selection)} />

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onClose?.()}>Cancel</Button>
        <Button type="button" onClick={async () => {
          try {
            // send selection to server to update accessControl immediately
            await fetch('/api/v1/models/access', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ groupId: group.id, selection })
            })
          } catch (e) {
            // ignore network errors for now
          }
          onSave?.(selection)
          onClose?.()
        }}>
          Save
        </Button>
      </DialogFooter>
    </div>
  )
}


