"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Model } from '@/types/model.types'
import { usePinnedModels } from "@/hooks/models/usePinnedModels"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavModels({ pinnedModels, currentUserId }: { pinnedModels: Model[]; currentUserId?: string | null }) {
  const { pinnedModels: localPinned } = usePinnedModels(currentUserId, { initialPinnedModels: pinnedModels })

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
