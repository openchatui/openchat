"use client"

import { Session } from "next-auth"
import { AdminSidebar } from "../AdminSidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAdminUI } from "@/hooks/useAdminUI"
import { useState } from "react"

interface AdminUIProps {
    session: Session | null
    modelIds: string[]
    initialChats?: any[]
}

export function AdminUI({ session, modelIds, initialChats = [] }: AdminUIProps) {
    const [open, setOpen] = useState(false)
    const {
        availableModelIds,
        selectedTaskModelId,
        titlePrompt,
        tagsPrompt,
        isLoadingConfig,
        error,
        updateTaskModel,
        setTitlePrompt,
        setTagsPrompt,
        persistTitlePrompt,
        persistTagsPrompt,
    } = useAdminUI({ modelIds })
    return (
        <AdminSidebar session={session} activeTab="ui" initialChats={initialChats}>
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-semibold">UI</h2>
                    <p className="text-muted-foreground">Manage UI settings and previews</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="task-model">Task Model</Label>
                                <div className="flex items-center gap-2">
                                    <Popover open={open} onOpenChange={setOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="task-model"
                                                variant="outline"
                                                role="combobox"
                                                disabled={isLoadingConfig}
                                                className="w-80 justify-between"
                                            >
                                                {selectedTaskModelId || (isLoadingConfig ? "Loading..." : "Select a model")}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-0">
                                            <Command>
                                                <CommandInput placeholder="Search models..." />
                                                <CommandEmpty>No model found.</CommandEmpty>
                                                <CommandList>
                                                    <CommandGroup>
                                                        {availableModelIds.map((id) => (
                                                            <CommandItem
                                                                key={id}
                                                                value={id}
                                                                onSelect={() => {
                                                                    updateTaskModel(id)
                                                                    setOpen(false)
                                                                }}
                                                            >
                                                                {id}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <p className="text-xs text-muted-foreground">Choose the default model used for tasks.</p>
                                {error && <p className="text-xs text-destructive">{error}</p>}
                            </div>
                            <Separator className="my-2" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Task Prompts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title-prompt">Title Prompt</Label>
                                <Input
                                    id="title-prompt"
                                    value={titlePrompt}
                                    onChange={(e) => setTitlePrompt(e.target.value)}
                                    onBlur={() => persistTitlePrompt()}
                                    placeholder="Enter the prompt used to generate titles"
                                    className="w-full max-w-5xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tags-prompt">Tags Prompt</Label>
                                <Input
                                    id="tags-prompt"
                                    value={tagsPrompt}
                                    onChange={(e) => setTagsPrompt(e.target.value)}
                                    onBlur={() => persistTagsPrompt()}
                                    placeholder="Enter the prompt used to generate tags"
                                    className="w-full max-w-5xl"
                                />
                            </div>
                            {error && <p className="text-xs text-destructive">{error}</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminSidebar>
    )
}


