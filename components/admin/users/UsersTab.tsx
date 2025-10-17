"use client"

import { MessageCircle, Edit, Trash2, Search } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { User, EditUserForm } from "@/lib/server/user-management/user.types"
import type { Group } from "@/lib/server/group-management/group.types"
import { getEmailInitials, MESSAGES, PLACEHOLDERS } from "@/constants/user"
import { EditUserDialog } from "./edit-user-dialog"
import { useDeleteUser } from '@/hooks/admin/users/useDeleteUser'

interface UsersTabProps {
  users: User[]
  searchTerm: string
  onSearchTermChange: (v: string) => void
  onViewChats: (userId: string) => void
  onEditUser: (user: User) => void
  editingUser: User | null
  editForm: EditUserForm
  showPassword: boolean
  onCloseEditUser: () => void
  onUpdateForm: (field: keyof EditUserForm, value: string) => void
  onTogglePasswordVisibility: () => void
  onProfileImageUploaded?: (url: string) => void
  groups?: Group[]
}

export function UsersTab({ users, searchTerm, onSearchTermChange, onViewChats, onEditUser, editingUser, editForm, showPassword, onCloseEditUser, onUpdateForm, onTogglePasswordVisibility, onProfileImageUploaded, groups = [] }: UsersTabProps) {
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null)
  const { mutate: removeUser, isLoading: isDeleting } = useDeleteUser()
  const [removedUserIds, setRemovedUserIds] = useState<Set<string>>(new Set())
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never"
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "moderator":
        return "secondary"
      default:
        return "outline"
    }
  }

  const filteredUsers = (!searchTerm
    ? users
    : users.filter((user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
      )
  ).filter((u) => !removedUserIds.has(u.id))

  const userById = (id: string | null) => {
    if (!id) return null
    return users.find(u => u.id === id) || null
  }

  const deleteUser = async (id: string) => {
    try {
      await removeUser(id)
      setRemovedUserIds(prev => new Set([...Array.from(prev), id]))
      setConfirmDeleteUserId(null)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={PLACEHOLDERS.SEARCH_USERS}
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">{MESSAGES.ROLE_LABEL}</TableHead>
              <TableHead>{MESSAGES.NAME_LABEL}</TableHead>
              <TableHead>{MESSAGES.EMAIL_LABEL}</TableHead>
              <TableHead className="w-32">{MESSAGES.LAST_ACTIVE_LABEL}</TableHead>
              <TableHead className="w-32">{MESSAGES.CREATED_AT_LABEL}</TableHead>
              <TableHead className="w-32">{MESSAGES.OAUTH_ID_LABEL}</TableHead>
              <TableHead className="w-32 text-right">{MESSAGES.ACTIONS_LABEL}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No users found matching your search" : MESSAGES.NO_USERS}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.image || user.profilePicture || undefined} alt={user.name} />
                        <AvatarFallback className="text-xs">{getEmailInitials(user.email)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.lastActive)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {user.oauthId ? `${user.oauthId.slice(0, 8)}...` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => onViewChats(user.id)} className="h-8 w-8 p-0" title={MESSAGES.CHATS}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onEditUser(user)} className="h-8 w-8 p-0" title={MESSAGES.EDIT}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title={MESSAGES.DELETE}
                        onClick={() => setConfirmDeleteUserId(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditUserDialog
        editingUser={editingUser}
        editForm={editForm}
        isUpdating={false}
        showPassword={showPassword}
        onClose={onCloseEditUser}
        onUpdateForm={onUpdateForm}
        onTogglePasswordVisibility={onTogglePasswordVisibility}
        onUpdateUser={() => {}}
        onDeleteUser={() => {}}
        onProfileImageUploaded={(url) => { if (url) onProfileImageUploaded?.(url) }}
        groups={groups}
      />

      <Dialog open={!!confirmDeleteUserId} onOpenChange={(open) => { if (!open) setConfirmDeleteUserId(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(() => {
              const u = userById(confirmDeleteUserId)
              return (
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete
                  {" "}
                  <span className="font-medium">{u?.name || u?.email || confirmDeleteUserId}</span>?
                  This action cannot be undone.
                </p>
              )
            })()}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmDeleteUserId(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => { if (confirmDeleteUserId) deleteUser(confirmDeleteUserId) }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


