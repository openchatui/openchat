"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Model } from '@/types/model.types'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavModels({ pinnedModels, currentUserId }: { pinnedModels: Model[]; currentUserId?: string | null }) {
  const [localPinned, setLocalPinned] = useState<Model[]>(pinnedModels || [])

  // Sync local state when props change
  useEffect(() => {
    setLocalPinned(pinnedModels || [])
  }, [pinnedModels])

  // Listen for client-side pin updates and refresh list
  useEffect(() => {
    const refresh = async () => {
      try {
        if (!currentUserId) return
        const [settingsRes, modelsRes] = await Promise.all([
          fetch(`/api/v1/users/${currentUserId}/settings`, { credentials: 'include' }),
          fetch('/api/v1/models', { credentials: 'include' }),
        ])
        if (!settingsRes.ok || !modelsRes.ok) return
        const settings = await settingsRes.json().catch(() => ({}))
        const modelsJson = await modelsRes.json().catch(() => ({}))
        const ids: string[] = Array.isArray(settings?.ui?.pinned_models) ? settings.ui.pinned_models : []
        const all: Model[] = Array.isArray(modelsJson?.models) ? modelsJson.models : []
        const setIds = new Set(ids)
        const next = all.filter((m: any) => setIds.has(m.id))
        setLocalPinned(next)
      } catch {
        // ignore
      }
    }
    const handler = () => { refresh() }
    window.addEventListener('pinned-models-updated', handler)
    return () => window.removeEventListener('pinned-models-updated', handler)
  }, [currentUserId])

  return (
    <SidebarGroup>
      {Array.isArray(localPinned) && localPinned.length > 0 && (
        <>
          <SidebarMenu>
            {localPinned.map((model: any) => (
              <SidebarMenuItem key={`pinned-${model.id}`}>
                <SidebarMenuButton asChild tooltip={model.name}>
                  {(() => {
                    const providerModelId = (model as any).providerId || model.id
                    const encoded = encodeURIComponent(providerModelId).replace(/%3A/g, ':')
                    const href = `/?model=${encoded}`
                    return (
                      <Link href={href} className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={model?.meta?.profile_image_url || "/OpenChat.png"} alt={model.name} />
                          <AvatarFallback>{String(model?.name || '?').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="truncate pb-1">{model.name}</span>
                      </Link>
                    )
                  })()}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </>
      )}
    </SidebarGroup>
  )
}
