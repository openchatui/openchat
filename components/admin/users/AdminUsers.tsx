"use client"

import { Session } from "next-auth"
import { AdminSidebar } from "../AdminSidebar"

// Users Panel Content (from users.tsx)
import { MessageCircle, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/useUsers";
import { EditUserDialog } from "./edit-user-dialog";
import { MESSAGES, PLACEHOLDERS, getEmailInitials } from "@/constants/user";
import type { User } from "@/types/user";
import type { Group } from "@/types/group";
import { useState, useMemo, useEffect } from "react";
import { deleteUserAction } from "@/actions/users";
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
import { DEFAULT_GROUP_PERMISSIONS, type GroupPermissions } from "@/types/permissions";
import { useActionState } from "react";
import { createGroupAction, updateGroupAction, type ActionResult } from "@/app/(main)/admin/users/actions/groups";
import { SaveStatusButton } from "@/components/ui/save-button";
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
  const [result, formAction] = useActionState<ActionResult, FormData>(createGroupAction as any, { status: 'idle' })
  const [createFormInstance, setCreateFormInstance] = useState(0)
  const [createDidSubmit, setCreateDidSubmit] = useState(false)

  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPerms, setEditPerms] = useState<GroupPermissions>(DEFAULT_GROUP_PERMISSIONS)
  const [editResult, editFormAction] = useActionState<ActionResult, FormData>(updateGroupAction as any, { status: 'idle' })
  const [editFormInstance, setEditFormInstance] = useState(0)
  const [editDidSubmit, setEditDidSubmit] = useState(false)
  const [editUserIds, setEditUserIds] = useState<string[]>([])
  const [membersOpen, setMembersOpen] = useState(false)

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

  useEffect(() => {
    if (editingGroup) {
      setEditName(editingGroup.name || '')
      setEditDescription(editingGroup.description || '')
      setEditPerms((editingGroup.permissions as any) || DEFAULT_GROUP_PERMISSIONS)
      setEditUserIds(Array.isArray((editingGroup as any).userIds) ? ((editingGroup as any).userIds as string[]) : [])
    }
  }, [editingGroup])

  useEffect(() => {
    if (editingGroup && editDidSubmit && editResult?.status === 'success') {
      setEditingGroup(null)
      setEditFormInstance((v) => v + 1)
      setEditDidSubmit(false)
    }
  }, [editingGroup, editDidSubmit, editResult])

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
    <AdminSidebar session={session} activeTab="users" initialChats={initialChats}>
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
    </AdminSidebar>
  )
}
