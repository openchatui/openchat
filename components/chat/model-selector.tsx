"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Check, ChevronsUpDown, Cpu, Link as LinkIcon, MoreHorizontal } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Model } from "@/lib/features/models/model.types"

interface ModelSelectorProps {
  selectedModelId?: string
  onModelSelect?: (model: Model) => void
  models?: Model[]
}

export function ModelSelector({ selectedModelId, onModelSelect, models = [] }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [userSelectedModel, setUserSelectedModel] = useState<Model | null>(null)
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Filter for active models only
  const activeModels = models.filter(model => model.isActive && !model.meta?.hidden)

  // Set selected model: user selection takes priority, then prop, then default
  const selectedModel = useMemo(() => {
    // If user has selected a model, use that
    if (userSelectedModel) return userSelectedModel

    // Otherwise use prop-specified model
    if (selectedModelId) {
      return activeModels.find(m => m.id === selectedModelId) || null
    }

    // Finally, default to first active model
    return activeModels.length > 0 ? activeModels[0] : null
  }, [userSelectedModel, selectedModelId, activeModels])

  // Models are pre-loaded, so no loading state needed
  const isLoading = false

  // Get parameter size for Ollama models
  const getParameterSize = (model: Model): string | null => {
    if (model.meta?.ownedBy?.toLowerCase() === 'ollama') {
      return model.meta?.details?.details?.parameter_size || null
    }
    return null
  }

  const isOllamaActive = (model: Model): boolean => {
    return Boolean(model.meta?.details?.runtime_active)
  }

  const isOllama = (model: Model): boolean => {
    return model.meta?.ownedBy?.toLowerCase() === 'ollama'
  }

  // Get display name (without parameter size for now)
  const getDisplayName = (model: Model): string => {
    return model.name
  }

  // Set initial selected model when models load (but don't override user selections)
  // Note: We don't call onModelSelect here because this is just initialization, not user selection
  useEffect(() => {
    if (!userSelectedModel && activeModels.length > 0) {
      const initialModel = selectedModelId
        ? activeModels.find(m => m.id === selectedModelId) || activeModels[0]
        : activeModels[0]

      if (initialModel) {
        setUserSelectedModel(initialModel)
        // Don't call onModelSelect here - this is initialization, not user selection
      }
    }
  }, [activeModels, selectedModelId, userSelectedModel])

  // Activate model from URL param ?model=...
  useEffect(() => {
    const param = searchParams?.get('model')
    if (!param || activeModels.length === 0) return
    // match by providerId or id
    const found = activeModels.find(m => (m as any).providerId === param || m.id === param || m.name === param)
    if (found && (!userSelectedModel || userSelectedModel.id !== found.id)) {
      setUserSelectedModel(found)
      onModelSelect?.(found)
    }
  }, [searchParams, activeModels, onModelSelect, userSelectedModel])

  // Load current user id
  useEffect(() => {
    let mounted = true
    const loadUser = async () => {
      try {
        const meRes = await fetch('/api/v1/users/me', { credentials: 'include' })
        if (!meRes.ok) return
        const me = await meRes.json().catch(() => null)
        if (mounted && me?.id) setCurrentUserId(String(me.id))
      } catch {}
    }
    loadUser()
    return () => { mounted = false }
  }, [])

  const handlePinModelById = async (modelId: string) => {
    try {
      if (!modelId) return
      if (!currentUserId) return
      await fetch(`/api/v1/users/${currentUserId}/settings/pinned`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelIds: [modelId] }),
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pinned-models-updated'))
      }
      setPinnedIds(prev => Array.from(new Set([...(prev || []), modelId])))
    } catch (e) {
      console.error('Failed to pin model', e)
    }
  }

  const handleUnpinModelById = async (modelId: string) => {
    try {
      if (!modelId) return
      if (!currentUserId) return
      const settingsRes = await fetch(`/api/v1/users/${currentUserId}/settings`, { credentials: 'include' })
      const settings = await settingsRes.json().catch(() => ({}))
      const ui = typeof settings?.ui === 'object' && settings.ui !== null ? settings.ui : {}
      const current: string[] = Array.isArray(ui.pinned_models) ? ui.pinned_models.filter((v: any) => typeof v === 'string') : []
      const next = current.filter((id: string) => id !== modelId)
      const nextSettings = { ...settings, ui: { ...ui, pinned_models: next } }
      await fetch(`/api/v1/users/${currentUserId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSettings),
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pinned-models-updated'))
      }
      setPinnedIds(next)
    } catch (e) {
      console.error('Failed to unpin model', e)
    }
  }

  useEffect(() => {
    let mounted = true
    const loadPinned = async () => {
      try {
        if (!currentUserId) return
        const res = await fetch(`/api/v1/users/${currentUserId}/settings`, { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json().catch(() => ({}))
        const ids = Array.isArray(data?.ui?.pinned_models) ? data.ui.pinned_models.filter((v: any) => typeof v === 'string') : []
        if (mounted) setPinnedIds(ids)
      } catch {}
    }
    loadPinned()
    return () => { mounted = false }
  }, [currentUserId])

  return (
    <div className="absolute top-4 left-4 z-10">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="w-fit h-12 justify-between bg-transparent hover:bg-muted/50 px-4"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              {selectedModel ? (
                <>
                  <Avatar className="h-8 w-8 bg-transparent">
                    <AvatarImage
                      src={selectedModel.meta?.profile_image_url || "/OpenChat.png"}
                      alt={selectedModel.name}
                      className="bg-transparent"
                    />
                    <AvatarFallback>
                      {selectedModel.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm">{getDisplayName(selectedModel)}</span>
                    {isOllama(selectedModel) ? (
                      <div className="flex items-center gap-2">
                        {getParameterSize(selectedModel) && (
                          <span className="text-xs text-primary/35 font-medium">
                            {getParameterSize(selectedModel)}
                          </span>
                        )}
                        {isOllamaActive(selectedModel) && (
                          <span className="inline-block h-2 w-2 rounded-full bg-green-500" title="Active" />
                        )}
                      </div>
                    ) : (
                      <LinkIcon style={{ width: 10, height: 10 }} className="shrink-0 text-primary/35 mt-0.5" />
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Cpu className="h-5 w-5" />
                  <span className="text-muted-foreground">Select model...</span>
                </>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-fit min-w-[300px] p-0 shadow-lg border scrollbar-hide"
        >
          <Command className="scrollbar-hide">
            <CommandInput placeholder="Search models..."/>
            <CommandList className="scrollbar-hide">
              <CommandEmpty>No models found.</CommandEmpty>
              {activeModels.length > 0 && (
                <CommandGroup>
                  {activeModels.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={model.name}
                      className="group/item"
                      onSelect={() => {
                        setUserSelectedModel(model)
                        const providerModelId = (model as any).providerId || model.id
                        onModelSelect?.({ ...(model as any), id: providerModelId } as Model)
                        setOpen(false)
                      }}
                    >
                      
                      <Avatar className="h-8 w-8 mr-2 bg-transparent">
                        <AvatarImage
                          src={model.meta?.profile_image_url || "/OpenChat.png"}
                          alt={model.name}
                          className="bg-transparent"
                        />
                        <AvatarFallback>
                          {model.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col w-full">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getDisplayName(model)}</span>
                          {isOllama(model) ? (
                            <div className="flex items-center gap-2">
                              {getParameterSize(model) && (
                                <span className="text-xs text-primary/35 font-medium">
                                  {getParameterSize(model)}
                                </span>
                              )}
                              {isOllamaActive(model) && (
                                <span className="inline-block h-2 w-2 rounded-full bg-green-500" title="Active" />
                              )}
                            </div>
                          ) : (
                            <LinkIcon style={{ width: 10, height: 10 }} className="shrink-0 text-primary/35 mt-0.5" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {model.meta?.ownedBy}
                        </span>
                      </div>
                      {selectedModel?.id === model.id ? (
                        <div className="relative mr-2" style={{ width: 16, height: 16 }}>
                          <Check
                            className={cn(
                              "absolute inset-0 h-4 w-4 transition-opacity",
                              "group-hover/item:opacity-0",
                              "opacity-100"
                            )}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute inset-0 h-4 w-4 p-0 opacity-0 group-hover/item:opacity-100"
                                aria-label="Model options"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                              {pinnedIds.includes(model.id) ? (
                                <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUnpinModelById(model.id) }}>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Hide from Sidebar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePinModelById(model.id) }}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Keep in Sidebar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : (
                        <div className="self-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                aria-label="Model options"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                              {pinnedIds.includes(model.id) ? (
                                <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUnpinModelById(model.id) }}>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Hide from Sidebar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePinModelById(model.id) }}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Keep in Sidebar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
