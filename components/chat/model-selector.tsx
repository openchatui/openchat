"use client"

import { useState, useEffect } from "react"
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
import { useModels } from "@/hooks/useModels"
import type { Model } from "@/types/models"

interface ModelSelectorProps {
  selectedModelId?: string
  onModelSelect?: (model: Model) => void
}

export function ModelSelector({ selectedModelId, onModelSelect }: ModelSelectorProps) {
  const { models, isLoading } = useModels()
  const [open, setOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)

  // Filter for active models only
  const activeModels = models.filter(model => model.isActive && !model.meta?.hidden)

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

  // Set selected model based on selectedModelId prop or default to first active model
  useEffect(() => {
    if (selectedModelId) {
      const model = activeModels.find(m => m.id === selectedModelId)
      if (model && model !== selectedModel) {
        setSelectedModel(model)
      }
    } else if (!selectedModel && activeModels.length > 0 && !isLoading) {
      const defaultModel = activeModels[0]
      setSelectedModel(defaultModel)
      onModelSelect?.(defaultModel)
    }
  }, [selectedModelId, activeModels, isLoading, selectedModel, onModelSelect])

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
                        setSelectedModel(model)
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
