import { Trash2, Save, Eye, EyeOff, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AnimatedLoader } from "@/components/ui/loader"
import { MESSAGES, PLACEHOLDERS, USER_ROLES, USER_GROUPS, getEmailInitials } from "@/constants/user"
import type { User as UserType, EditUserForm } from "@/types/user"

interface EditUserDialogProps {
  editingUser: UserType | null
  editForm: EditUserForm
  isUpdating: boolean
  showPassword: boolean
  onClose: () => void
  onUpdateForm: (field: keyof EditUserForm, value: string) => void
  onTogglePasswordVisibility: () => void
  onUpdateUser: () => void
  onDeleteUser: () => void
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
  onDeleteUser
}: EditUserDialogProps) {
  if (!editingUser) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }


  return (
    <Dialog open={!!editingUser} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        {/* User Profile Section */}
        <div className="flex items-center space-x-4 py-4 border-b">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={editingUser.profilePicture || undefined}
              alt={editingUser.name}
            />
            <AvatarFallback className="text-lg">
              {getEmailInitials(editingUser.email)}
            </AvatarFallback>
          </Avatar>
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

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="destructive"
              onClick={onDeleteUser}
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              {isUpdating ? (
                <AnimatedLoader className="h-8 w-8" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {MESSAGES.DELETE}
            </Button>

            <Button
              onClick={onUpdateUser}
              disabled={isUpdating || !editForm.name.trim() || !editForm.email.trim()}
              className="flex items-center gap-2"
            >
              {isUpdating ? (
                <AnimatedLoader className="h-8 w-8" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isUpdating ? MESSAGES.SAVING : MESSAGES.SAVE}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
