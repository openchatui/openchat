"use client"

import { useMemo, useState } from "react"
import { Trash2, Save, Eye, EyeOff, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { MESSAGES, PLACEHOLDERS, USER_ROLES, USER_GROUPS, getEmailInitials } from "@/constants/user"
import type { User as UserType, EditUserForm } from "@/lib/server/user-management/user.types"
import type { Group } from "@/lib/server/group-management/group.types"
import { updateUserAction, deleteUserAction } from "@/actions/users"
import { useFormStatus } from "react-dom"
import { SaveStatusButton } from "@/components/ui/save-button"

interface EditUserDialogProps {
  editingUser: UserType | null
  editForm: EditUserForm
  isUpdating: boolean
  showPassword: boolean
  onClose: () => void
  onUpdateForm: (field: keyof EditUserForm, value: string) => void
  onTogglePasswordVisibility: () => void
  onUpdateUser?: () => void
  onDeleteUser?: () => void
  onProfileImageSelected?: (file: File) => void
  onProfileImageUploaded?: (url: string) => void
  groups?: Group[]
}

export function EditUserDialog({
  editingUser,
  editForm,
  isUpdating,
  showPassword,
  onClose,
  onUpdateForm,
  onTogglePasswordVisibility,
  onUpdateUser,
  onDeleteUser,
  onProfileImageSelected,
  onProfileImageUploaded,
  groups = []
}: EditUserDialogProps) {
  if (!editingUser) return null

  const updateFormId = `update-user-form-${editingUser.id}`

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date)
  }

  const uploadInputId = `edit-user-avatar-upload-${editingUser.id}`
  const [localPreviewSrc, setLocalPreviewSrc] = useState<string | undefined>(undefined)
  const [, setIsUploading] = useState(false)
  const displayedAvatarSrc = useMemo(
    () => localPreviewSrc || editingUser.image || editingUser.profilePicture || undefined,
    [localPreviewSrc, editingUser.image, editingUser.profilePicture]
  )

  const initialGroupIds = useMemo(() => {
    const ids = (groups || [])
      .filter(g => Array.isArray((g as any).userIds) && ((g as any).userIds as string[]).includes(editingUser.id))
      .map(g => g.id)
    return ids
  }, [groups, editingUser.id])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialGroupIds)
  const [groupsOpen, setGroupsOpen] = useState(false)


  return (
    <Dialog open={!!editingUser} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        {/* User Profile Section */}
        <div className="flex items-center space-x-4 py-4 border-b">
          <label
            htmlFor={uploadInputId}
            className="cursor-pointer group relative inline-block"
            title="Click to change profile picture"
            aria-label="Upload profile picture"
          >
            <Avatar className="h-16 w-16 transition">
              <AvatarImage src={displayedAvatarSrc} alt={editingUser.name} />
              <AvatarFallback className="text-lg">
                {getEmailInitials(editingUser.email)}
              </AvatarFallback>
            </Avatar>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
              <span className="text-xs font-medium text-white">Upload</span>
            </div>
          </label>
          <input
            id={uploadInputId}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) { e.currentTarget.value = ''; return }
              onProfileImageSelected?.(file)
              const objectUrl = URL.createObjectURL(file)
              setLocalPreviewSrc(objectUrl)
              setIsUploading(true)
              const formData = new FormData()
              formData.append('userId', editingUser.id)
              formData.append('file', file)
              fetch('/api/v1/users/profile-image', { method: 'POST', body: formData })
                .then(async (res) => {
                  if (!res.ok) throw new Error('Upload failed')
                  const data = await res.json()
                  const url = data?.url as string | undefined
                  if (url) {
                    setLocalPreviewSrc(url)
                    onProfileImageUploaded?.(url)
                  }
                })
                .catch(() => {
                  // If upload fails, revert preview
                  setLocalPreviewSrc(undefined)
                })
                .finally(() => {
                  setIsUploading(false)
                })
              // reset to allow re-selecting the same file
              e.currentTarget.value = ''
            }}
          />
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{editingUser.name}</h3>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(editingUser.createdAt)}
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          {/* Name Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{MESSAGES.NAME_LABEL}</label>
            <Input
              name="name"
              form={updateFormId}
              value={editForm.name}
              onChange={(e) => onUpdateForm('name', e.target.value)}
              placeholder={PLACEHOLDERS.NAME}
              onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{MESSAGES.EMAIL_LABEL}</label>
            <Input
              type="email"
              name="email"
              form={updateFormId}
              value={editForm.email}
              onChange={(e) => onUpdateForm('email', e.target.value)}
              placeholder={PLACEHOLDERS.EMAIL}
              onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
            />
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{MESSAGES.ROLE_LABEL}</label>
            <Select
              value={editForm.role}
              onValueChange={(value) => onUpdateForm('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USER_ROLES.USER}>User</SelectItem>
                <SelectItem value={USER_ROLES.MODERATOR}>Moderator</SelectItem>
                <SelectItem value={USER_ROLES.ADMIN}>Admin</SelectItem>
              </SelectContent>
            </Select>
            {/* Hidden mirror for form submit */}
            <input type="hidden" name="role" form={updateFormId} value={editForm.role} />
          </div>

          {/* User Group Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Groups</label>
            <Popover open={groupsOpen} onOpenChange={setGroupsOpen} modal={false}>
              <PopoverTrigger asChild>
                <Button type="button" size="icon" variant="secondary" className="h-8 w-8 rounded-full">
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[320px] p-0 z-50">
                <Command>
                  <CommandInput placeholder="Search groups..." />
                  <CommandList>
                    <CommandEmpty>No groups found.</CommandEmpty>
                    <CommandGroup>
                      {(groups || []).map((g) => {
                        const checked = selectedGroupIds.includes(g.id)
                        return (
                          <CommandItem
                            key={g.id}
                            value={(g.name || g.id).toLowerCase()}
                            onMouseDown={(e) => e.preventDefault()}
                            onSelect={() => {
                              setSelectedGroupIds(prev => {
                                const isSelected = (prev || []).includes(g.id)
                                return isSelected ? (prev || []).filter(id => id !== g.id) : Array.from(new Set([...(prev || []), g.id]))
                              })
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`h-3 w-3 rounded-full border ${checked ? 'bg-primary' : 'bg-transparent'}`} />
                              <span>{g.name || g.id}</span>
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
          <div className="flex flex-wrap gap-2">
            {selectedGroupIds.length === 0 ? (
              <span className="text-sm text-muted-foreground">No groups</span>
            ) : (
              selectedGroupIds.map((gid) => {
                const g = (groups || []).find(gr => gr.id === gid)
                const label = g?.name || gid
                return (
                  <Badge key={gid} variant="secondary" className="gap-1">
                    {label}
                    <button
                      type="button"
                      className="ml-1 inline-flex items-center"
                      aria-label={`Remove ${label}`}
                      onClick={() => setSelectedGroupIds(prev => (prev || []).filter(id => id !== gid))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })
            )}
          </div>

          {/* Mirror groups into main update form */}
          <input type="hidden" name="groupIds" form={updateFormId} value={JSON.stringify(selectedGroupIds)} />
        </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{MESSAGES.PASSWORD_LABEL}</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                form={updateFormId}
                value={editForm.password || ''}
                onChange={(e) => onUpdateForm('password', e.target.value)}
                placeholder={PLACEHOLDERS.PASSWORD}
                className="pr-10"
                onFocus={(e) => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={onTogglePasswordVisibility}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to keep current password
            </p>
          </div>

          {/* Action Buttons: Delete on left, Save on right, side-by-side */}
          <div className="flex items-center justify-between pt-4">
            <form action={deleteUserAction}>
              <input type="hidden" name="id" value={editingUser.id} />
              <DeleteButton />
            </form>

            <form id={updateFormId} action={updateUserAction}>
              <input type="hidden" name="id" value={editingUser.id} />
              <SaveStatusButton disabled={!editForm.name.trim() || !editForm.email.trim()} />
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Removed local SubmitButton in favor of SaveStatusButton

function DeleteButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="destructive" disabled={pending} className="flex items-center gap-2">
      <Trash2 className="h-4 w-4" />
      {pending ? "Deleting…" : MESSAGES.DELETE}
    </Button>
  )
}
