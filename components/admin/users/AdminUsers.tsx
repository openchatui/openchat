"use client"

import { Session } from "next-auth"
import { AdminSidebar } from "../AdminSidebar"

// Users Panel Content (from users.tsx)
import { Loader2, MessageCircle, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUsers } from "@/hooks/useUsers";
import { EditUserDialog } from "./edit-user-dialog";
import { MESSAGES, PLACEHOLDERS, getEmailInitials } from "@/constants/user";
import type { User } from "@/types/user";
import { useState, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Main Admin Users Component
interface AdminUsersProps {
    session: Session | null
    initialChats?: any[]
}

export function AdminUsers({ session, initialChats = [] }: AdminUsersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const {
    users,
    isLoading,
    deletingIds,
    editingUser,
    editForm,
    isUpdating,
    showPassword,
    handleEditUser,
    updateEditForm,
    updateUser,
    deleteUser,
    togglePasswordVisibility,
    setEditState,
  } = useUsers();

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "moderator":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleDeleteUser = async () => {
    if (!editingUser) return;
    await deleteUser(editingUser.id);
  };

  const handleViewChats = (userId: string) => {
    // TODO: Implement view chats functionality
    console.log("View chats for user:", userId);
  };

  return (
    <AdminSidebar session={session} activeTab="users" initialChats={initialChats}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">{MESSAGES.USERS_TITLE}</h2>
          <p className="text-muted-foreground">{MESSAGES.USERS_DESCRIPTION}</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={PLACEHOLDERS.SEARCH_USERS}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">{MESSAGES.ROLE_LABEL}</TableHead>
                <TableHead>{MESSAGES.NAME_LABEL}</TableHead>
                <TableHead>{MESSAGES.EMAIL_LABEL}</TableHead>
                <TableHead className="w-32">
                  {MESSAGES.LAST_ACTIVE_LABEL}
                </TableHead>
                <TableHead className="w-32">
                  {MESSAGES.CREATED_AT_LABEL}
                </TableHead>
                <TableHead className="w-32">{MESSAGES.OAUTH_ID_LABEL}</TableHead>
                <TableHead className="w-32 text-right">
                  {MESSAGES.ACTIONS_LABEL}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    {searchTerm
                      ? "No users found matching your search"
                      : MESSAGES.NO_USERS}
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
                          <AvatarImage
                            src={user.profilePicture || undefined}
                            alt={user.name}
                          />
                          <AvatarFallback className="text-xs">
                            {getEmailInitials(user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.lastActive)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {user.oauthId ? `${user.oauthId.slice(0, 8)}...` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewChats(user.id)}
                          className="h-8 w-8 p-0"
                          title={MESSAGES.CHATS}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="h-8 w-8 p-0"
                          title={MESSAGES.EDIT}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(user.id)}
                          disabled={deletingIds.has(user.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title={MESSAGES.DELETE}
                        >
                          {deletingIds.has(user.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete user?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the user and remove their data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={confirmDeleteId ? deletingIds.has(confirmDeleteId) : false}
                onClick={async () => {
                  if (!confirmDeleteId) return
                  await deleteUser(confirmDeleteId)
                  setConfirmDeleteId(null)
                }}
              >
                {confirmDeleteId && deletingIds.has(confirmDeleteId) ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit User Dialog */}
        <EditUserDialog
          editingUser={editingUser}
          editForm={editForm}
          isUpdating={isUpdating}
          showPassword={showPassword}
          onClose={() => setEditState((prev) => ({ ...prev, editingUser: null }))}
          onUpdateForm={updateEditForm}
          onTogglePasswordVisibility={togglePasswordVisibility}
          onUpdateUser={updateUser}
          onDeleteUser={handleDeleteUser}
        />
      </div>
    </AdminSidebar>
  )
}
