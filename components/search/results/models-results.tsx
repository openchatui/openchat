"use server"

import Link from "next/link"
import { searchUserModels } from "@/lib/modules/search"
import { getModels } from "@/actions/chat"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface ModelsResultsProps {
  userId: string
  query?: string
  mentions: string[]
}

export default async function ModelsResults({ userId, query, mentions }: ModelsResultsProps) {
  let models: any[] = []
  if (query && query.trim()) {
    models = await searchUserModels(userId, { query, mentions })
  } else {
    models = await getModels()
  }

  return (
    <div className="mt-4 space-y-6 min-w-[6rem] mx-56">
      <div>
        {(() => {
          const active = models.filter((m: any) => m?.isActive !== false)
          const inactive = models.filter((m: any) => m?.isActive === false)
          if (active.length === 0 && inactive.length === 0) {
            return <div className="text-sm text-muted-foreground">No results</div>
          }
          return (
            <div className="space-y-6">
              {active.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Active</div>
                  <ul className="space-y-2">
                    {active.map((m: any) => {
                      const providerModelId = (m as any).providerId || m.id
                      const encoded = encodeURIComponent(providerModelId).replace(/%3A/g, ':')
                      const href = `/?model=${encoded}`
                      return (
                        <li key={m.id} className="px-3 py-2 rounded-md hover:bg-accent/60 transition-colors">
                          <Link href={href} className="block">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={m?.meta?.profile_image_url || "/OpenChat.png"} alt={m?.name || "Model"} />
                                  <AvatarFallback>{String(m?.name || '?').charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="text-sm font-medium">{m.name}</div>
                              </div>
                              <div className="min-w-0 flex items-center gap-2">
                                {m.provider && (
                                  <div className="text-xs text-muted-foreground max-w-[70%] text-right">{String(m.provider)}</div>
                                )}
                              </div>
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {inactive.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Inactive</div>
                  <ul className="space-y-2">
                    {inactive.map((m: any) => {
                      const providerModelId = (m as any).providerId || m.id
                      const encoded = encodeURIComponent(providerModelId).replace(/%3A/g, ':')
                      const href = `/?model=${encoded}`
                      return (
                        <li key={m.id} className="px-3 py-2 rounded-md hover:bg-accent/60 transition-colors">
                          <Link href={href} className="block">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={m?.meta?.profile_image_url || "/OpenChat.png"} alt={m?.name || "Model"} />
                                  <AvatarFallback>{String(m?.name || '?').charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="text-sm font-medium truncate">{m.name}</div>
                              </div>
                              <div className="min-w-0 flex items-center gap-2">
                                {m.provider && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[50%] text-right">{String(m.provider)}</div>
                                )}
                                <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 shrink-0">Inactive</Badge>
                              </div>
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}


