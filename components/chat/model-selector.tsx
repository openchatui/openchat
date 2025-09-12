"use client"

import { useState, useEffect, useMemo } from "react"
import { Check, ChevronsUpDown, Cpu, Link as LinkIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import type { Model } from "@/types/models"

interface ModelSelectorProps {
  selectedModelId?: string
  onModelSelect?: (model: Model) => void
  models?: Model[]
}

export function ModelSelector({ selectedModelId, onModelSelect, models = [] }: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [userSelectedModel, setUserSelectedModel] = useState<Model | null>(null)

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
                    {isOllama(selectedModel)
                      ? (getParameterSize(selectedModel) && (
                          <span className="text-xs text-primary/35 font-medium">
                            {getParameterSize(selectedModel)}
                          </span>
                        ))
                      : (<LinkIcon style={{ width: 10, height: 10 }} className="shrink-0 text-primary/35 mt-0.5" />)
                    }
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
                          {isOllama(model)
                            ? (getParameterSize(model) && (
                                <span className="text-xs text-primary/35 font-medium">
                                  {getParameterSize(model)}
                                </span>
                              ))
                            : (<LinkIcon style={{ width: 10, height: 10 }} className="shrink-0 text-primary/35 mt-0.5" />)
                          }
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {model.meta?.ownedBy}
                        </span>
                      </div>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedModel?.id === model.id ? "opacity-100" : "opacity-0"
                        )}
                      />
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
