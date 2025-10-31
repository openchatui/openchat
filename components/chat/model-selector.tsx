"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Check, ChevronsUpDown, Cpu, Link as LinkIcon, MoreHorizontal, PanelLeft } from "lucide-react"
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
import type { Model } from '@/types/model.types'
import { usePinnedModels } from "@/hooks/models/usePinnedModels"
import { useSidebar } from "@/components/ui/sidebar"

interface ModelSelectorProps {
  selectedModelId?: string
  onModelSelect?: (model: Model) => void
  models?: Model[]
  currentUserId?: string | null
}

export function ModelSelector({ selectedModelId, onModelSelect, models = [], currentUserId }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [userSelectedModel, setUserSelectedModel] = useState<Model | null>(null)
  const { pinnedIds, pin, unpin } = usePinnedModels(currentUserId, { allModels: models })
  const { setOpenMobile } = useSidebar()
  const searchParams = useSearchParams()
  const activeModels = models.filter(model => model.isActive && !model.meta?.hidden)

  const resolveByIdLike = (idLike?: string | null): Model | null => {
    if (!idLike) return null
    const normalize = (v: string) => v.trim().toLowerCase()
    const target = normalize(idLike)
    for (const m of activeModels) {
      const idMatch = normalize(m.id) === target
      const providerId = (m as any).providerId as string | undefined
      const providerMatch = providerId ? normalize(providerId) === target : false
      const providerSuffix = providerId ? (providerId.split('/').pop() || providerId) : undefined
      const providerSuffixMatch = providerSuffix ? normalize(providerSuffix) === target : false
      const nameMatch = normalize(m.name) === target
      if (idMatch || providerMatch || providerSuffixMatch || nameMatch) return m
    }
    return null
  }

  const selectedModel = useMemo(() => {
    if (userSelectedModel) return userSelectedModel

    if (selectedModelId) {
      return activeModels.find(m => m.id === selectedModelId) || null
    }

    return activeModels.length > 0 ? activeModels[0] : null
  }, [userSelectedModel, selectedModelId, activeModels])

  const isLoading = false
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

  const getDisplayName = (model: Model): string => {
    return model.name
  }

  useEffect(() => {
    if (!userSelectedModel && activeModels.length > 0) {
      const initialModel = selectedModelId
        ? (resolveByIdLike(selectedModelId) || activeModels[0])
        : activeModels[0]

      if (initialModel) {
        setUserSelectedModel(initialModel)
      }
    }
  }, [activeModels, selectedModelId, userSelectedModel])

  // Sync when parent-selected id changes
  useEffect(() => {
    if (!selectedModelId || activeModels.length === 0) return
    const match = resolveByIdLike(selectedModelId)
    if (match && (!userSelectedModel || userSelectedModel.id !== match.id)) {
      setUserSelectedModel(match)
    }
  }, [selectedModelId, activeModels])

  useEffect(() => {
    const param = searchParams?.get('model')
    if (!param || activeModels.length === 0) return
    const found = resolveByIdLike(param)
    if (found && (!userSelectedModel || userSelectedModel.id !== found.id)) {
      setUserSelectedModel(found)
      onModelSelect?.(found)
    }
  }, [searchParams, activeModels, onModelSelect, userSelectedModel])

  const handlePinModelById = async (modelId: string) => { await pin(modelId) }
  const handleUnpinModelById = async (modelId: string) => { await unpin(modelId) }

  return (
    <>
      <div className="fixed inset-x-0 top-0 h-22 md:hidden pointer-events-none z-[5] bg-gradient-to-b from-background via-background to-transparent" />
      <div className="absolute top-4 left-4 z-10 flex items-center gap-0">
      <Button
        variant="ghost"
        size="icon"
        className="h-12 w-12 md:hidden"
        aria-label="Open sidebar"
        onClick={() => setOpenMobile(true)}
      >
        <PanelLeft className="h-5 w-5" />
      </Button>
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
                        onModelSelect?.(model)
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
    </>
  )
}
