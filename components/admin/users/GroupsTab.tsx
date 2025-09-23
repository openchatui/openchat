"use client"

import { useActionState, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Box } from "lucide-react"
import { ModelsDialogContent } from "./models-dialog"
import { DEFAULT_GROUP_PERMISSIONS, type GroupPermissions } from "@/lib/server/access-control/permissions.types"
import type { Group } from "@/lib/server/group-management/group.types"
import type { User } from "@/lib/server/user-management/user.types"
import { createGroupAction, type ActionResult } from "@/actions/groups"
import { SaveStatusButton } from "@/components/ui/save-button"
import { EditGroupDialog } from "./edit-group-dialog"

interface GroupsTabProps {
  groups: Group[]
  users: User[]
}

export function GroupsTab({ groups, users }: GroupsTabProps) {
  const [openCreate, setOpenCreate] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [perms, setPerms] = useState<GroupPermissions>(DEFAULT_GROUP_PERMISSIONS)
  const [result, formAction] = useActionState<ActionResult, FormData>(createGroupAction as any, { status: 'idle' })
  const [createFormInstance, setCreateFormInstance] = useState(0)
  const [createDidSubmit, setCreateDidSubmit] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  // track by id to avoid object identity issues that close the dialog
  const [editingModelsGroupId, setEditingModelsGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (openCreate && createDidSubmit && result?.status === 'success') {
      setOpenCreate(false)
      setGroupName("")
      setGroupDescription("")
      setPerms(DEFAULT_GROUP_PERMISSIONS)
      setCreateFormInstance((v) => v + 1)
      setCreateDidSubmit(false)
    }
  }, [openCreate, createDidSubmit, result])

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never"
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Manage access groups and permissions</div>
        <Dialog open={openCreate} onOpenChange={(o) => { setOpenCreate(o); if (!o) { setGroupName(""); setGroupDescription(""); setPerms(DEFAULT_GROUP_PERMISSIONS); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> New Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create Group</DialogTitle>
              <DialogDescription>Define a group and its permissions.</DialogDescription>
            </DialogHeader>
            <form key={createFormInstance} action={formAction} className="flex flex-col gap-4" onSubmit={() => setCreateDidSubmit(true)}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} placeholder="Optional description" />
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
              <DialogFooter>
                {result?.status === 'error' && (
                  <div className="text-sm text-destructive mr-auto">{(result as any).message}</div>
                )}
                <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
                <SaveStatusButton label="Save Group" />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-64">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24">Users</TableHead>
              <TableHead className="w-40">Created</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No groups found</TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name || group.id}</TableCell>
                  <TableCell className="text-muted-foreground">{group.description || '-'}</TableCell>
                  <TableCell>{group.userCount ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(group.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Dialog open={editingModelsGroupId === group.id} onOpenChange={(o) => { if (!o) setEditingModelsGroupId(null) }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-2" onClick={() => setEditingModelsGroupId(group.id)} title="Manage model access">
                          <Box className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <ModelsDialogContent group={group} onClose={() => setEditingModelsGroupId(null)} onSave={() => { /* selection available via hidden input for server */ }} />
                      </DialogContent>
                    </Dialog>

                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingGroup(group)} title="Edit group">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditGroupDialog group={editingGroup} users={users} onClose={() => setEditingGroup(null)} />
    </div>
  )
}


