"use client"

import { Session } from "next-auth"
import { AdminSidebar } from "../AdminSidebar"

// Users Panel Content (from users.tsx)
import { MessageCircle, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/useUsers";
import { EditUserDialog } from "./edit-user-dialog";
import { MESSAGES, PLACEHOLDERS, getEmailInitials } from "@/constants/user";
import type { User } from "@/lib/server/user-management/user.types";
import type { Group } from "@/lib/server/group-management/group.types";
import { useState, useMemo, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { DEFAULT_GROUP_PERMISSIONS, type GroupPermissions } from "@/lib/server/access-control/permissions.types";
import { UsersTab } from "./UsersTab";
import { GroupsTab } from "./GroupsTab";

// Main Admin Users Component
interface AdminUsersProps {
    session: Session | null
    initialChats?: any[]
    initialUsers?: User[]
    initialGroups?: Group[]
}

export function AdminUsers({ session, initialChats = [], initialUsers = [], initialGroups = [] }: AdminUsersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [perms, setPerms] = useState<GroupPermissions>(DEFAULT_GROUP_PERMISSIONS)
  const [createFormInstance, setCreateFormInstance] = useState(0)

  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPerms, setEditPerms] = useState<GroupPermissions>(DEFAULT_GROUP_PERMISSIONS)
  const [editFormInstance, setEditFormInstance] = useState(0)
  const [editUserIds, setEditUserIds] = useState<string[]>([])
  const [membersOpen, setMembersOpen] = useState(false)

  // Creation handled in GroupsTab

  useEffect(() => {
    if (editingGroup) {
      setEditName(editingGroup.name || '')
      setEditDescription(editingGroup.description || '')
      setEditPerms((editingGroup.permissions as any) || DEFAULT_GROUP_PERMISSIONS)
      setEditUserIds(Array.isArray((editingGroup as any).userIds) ? ((editingGroup as any).userIds as string[]) : [])
    }
  }, [editingGroup])

  // Group edit handled in EditGroupDialog

  const {
    users,
    isLoading,
    editingUser,
    editForm,
    showPassword,
    handleEditUser,
    updateEditForm,
    togglePasswordVisibility,
    setEditState,
    updateUserImage,
  } = useUsers(initialUsers);

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
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date)
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

  const handleDeleteUser = async () => {};

  const handleViewChats = (userId: string) => {
    // TODO: Implement view chats functionality
    console.log("View chats for user:", userId);
  };

  return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">{MESSAGES.USERS_TITLE}</h2>
          <p className="text-muted-foreground">{MESSAGES.USERS_DESCRIPTION}</p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
          <UsersTab
            users={users}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onViewChats={handleViewChats}
            onEditUser={handleEditUser}
            editingUser={editingUser}
            editForm={editForm}
            showPassword={showPassword}
            onCloseEditUser={() => setEditState((prev) => ({ ...prev, editingUser: null }))}
            onUpdateForm={updateEditForm}
            onTogglePasswordVisibility={togglePasswordVisibility}
            onProfileImageUploaded={(url) => { if (url) updateUserImage(url) }}
            groups={initialGroups}
          />
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <GroupsTab groups={initialGroups} users={users} />
          </TabsContent>
        </Tabs>
      </div>
    
  )
}
