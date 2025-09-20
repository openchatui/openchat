"use client"

import { useMemo, useState } from "react"
import { Trash2, Save, Eye, EyeOff, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MESSAGES, PLACEHOLDERS, USER_ROLES, USER_GROUPS, getEmailInitials } from "@/constants/user"
import type { User as UserType, EditUserForm } from "@/types/user"
import { updateUserAction, deleteUserAction } from "@/actions/users"
import { useFormStatus } from "react-dom"

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
  onProfileImageUploaded
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
            <label className="text-sm font-medium">{MESSAGES.USER_GROUP_LABEL}</label>
            <Select
              value={editForm.userGroup}
              onValueChange={(value) => onUpdateForm('userGroup', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USER_GROUPS.DEFAULT}>Default</SelectItem>
                <SelectItem value={USER_GROUPS.PREMIUM}>Premium</SelectItem>
                <SelectItem value={USER_GROUPS.ENTERPRISE}>Enterprise</SelectItem>
              </SelectContent>
            </Select>
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
              <SubmitButton disabled={!editForm.name.trim() || !editForm.email.trim()} />
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending || disabled} className="flex items-center gap-2">
      <Save className="h-4 w-4" />
      {pending ? "Saving…" : MESSAGES.SAVE}
    </Button>
  )
}

function DeleteButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="destructive" disabled={pending} className="flex items-center gap-2">
      <Trash2 className="h-4 w-4" />
      {pending ? "Deleting…" : MESSAGES.DELETE}
    </Button>
  )
}
