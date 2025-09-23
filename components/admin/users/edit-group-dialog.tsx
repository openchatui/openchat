"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ChevronsUpDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useActionState } from "react"
import { updateGroupAction, type ActionResult } from "@/actions/groups"
import type { Group } from "@/lib/server/group-management/group.types"
import type { User } from "@/lib/server/user-management/user.types"
import { DEFAULT_GROUP_PERMISSIONS, type GroupPermissions } from "@/lib/server/access-control/permissions.types"
import { SaveStatusButton } from "@/components/ui/save-button"
import { getEmailInitials } from "@/constants/user"

interface EditGroupDialogProps {
  group: Group | null
  users: User[]
  onClose: () => void
}

export function EditGroupDialog({ group, users, onClose }: EditGroupDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [perms, setPerms] = useState<GroupPermissions>(DEFAULT_GROUP_PERMISSIONS)
  const [userIds, setUserIds] = useState<string[]>([])
  const [membersOpen, setMembersOpen] = useState(false)
  const [result, formAction] = useActionState<ActionResult, FormData>(updateGroupAction as any, { status: 'idle' })
  const [didSubmit, setDidSubmit] = useState(false)

  useEffect(() => {
    if (group) {
      setName(group.name || '')
      setDescription(group.description || '')
      setPerms((group.permissions as any) || DEFAULT_GROUP_PERMISSIONS)
      setUserIds(Array.isArray((group as any).userIds) ? ((group as any).userIds as string[]) : [])
    }
  }, [group])

  useEffect(() => {
    if (group && didSubmit && result?.status === 'success') {
      onClose()
      setDidSubmit(false)
    }
  }, [group, didSubmit, result, onClose])

  if (!group) return null

  return (
    <Dialog open={!!group} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
          <DialogDescription>Update group name, description and permissions.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4" onSubmit={() => setDidSubmit(true)}>
          <input type="hidden" name="id" value={group?.id || ''} />
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" name="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input id="edit-description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Members</Label>
              <Popover open={membersOpen} onOpenChange={setMembersOpen} modal>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={membersOpen} className="w-full justify-between">
                    <span className={cn("truncate", userIds.length === 0 && "text-muted-foreground")}>
                      {userIds.length === 0 ? 'Select users...' : `${userIds.length} selected`}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[420px] p-0 z-[70]">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup>
                        {users.map((u) => {
                          const checked = userIds.includes(u.id)
                          return (
                            <CommandItem
                              key={u.id}
                              value={(u.name || u.email || u.id).toLowerCase()}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setUserIds((prev) => {
                                  const isSelected = (prev || []).includes(u.id)
                                  return isSelected ? (prev || []).filter((id) => id !== u.id) : Array.from(new Set([...(prev || []), u.id]))
                                })
                              }}
                              className="cursor-default"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <Checkbox
                                  checked={checked}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mr-1"
                                  aria-label={`Select ${u.name}`}
                                />
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={u.image || u.profilePicture || undefined} alt={u.name} />
                                  <AvatarFallback className="text-[10px]">{getEmailInitials(u.email)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm truncate">{u.name}</span>
                                  <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                                </div>
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
            </div>
          </div>

          <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <div className="font-medium">Workspace</div>
              <div className="space-y-2">
                {(['models','knowledge','prompts','tools'] as const).map((k) => (
                  <div key={k} className="flex items-center justify-between">
                    <Label className="capitalize">{k.replace('_',' ')}</Label>
                    <Switch checked={!!perms.workspace?.[k]} onCheckedChange={(v) => setPerms((p) => ({ ...p, workspace: { ...p.workspace, [k]: v } }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Sharing</div>
              <div className="space-y-2">
                {(['public_models','public_knowledge','public_prompts','public_tools'] as const).map((k) => (
                  <div key={k} className="flex items-center justify-between">
                    <Label className="capitalize">{k.replaceAll('_',' ')}</Label>
                    <Switch checked={!!perms.sharing?.[k]} onCheckedChange={(v) => setPerms((p) => ({ ...p, sharing: { ...p.sharing, [k]: v } }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Chat</div>
              <div className="space-y-2">
                {(['controls','valves','system_prompt','params','file_upload','delete','edit','share','export','stt','tts','call','multiple_models','temporary','temporary_enforced'] as const).map((k) => (
                  <div key={k} className="flex items-center justify-between">
                    <Label className="capitalize">{k.replaceAll('_',' ')}</Label>
                    <Switch checked={!!perms.chat?.[k]} onCheckedChange={(v) => setPerms((p) => ({ ...p, chat: { ...p.chat, [k]: v } }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Features</div>
              <div className="space-y-2">
                {(['direct_tool_servers','web_search','image_generation','code_interpreter','notes'] as const).map((k) => (
                  <div key={k} className="flex items-center justify-between">
                    <Label className="capitalize">{k.replaceAll('_',' ')}</Label>
                    <Switch checked={!!perms.features?.[k]} onCheckedChange={(v) => setPerms((p) => ({ ...p, features: { ...p.features, [k]: v } }))} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <input type="hidden" name="permissions" value={JSON.stringify(perms)} />
          <input type="hidden" name="userIds" value={JSON.stringify(userIds)} />

          <DialogFooter>
            {result?.status === 'error' && (
              <div className="text-sm text-destructive mr-auto">{(result as any).message}</div>
            )}
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <SaveStatusButton label="Save Changes" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


