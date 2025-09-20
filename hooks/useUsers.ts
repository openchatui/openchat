"use client"

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type {
  User,
  UsersState,
  EditUserState,
  EditUserForm,
  UpdateUserData
} from '@/types/user'
import { API_ENDPOINTS, TOAST_MESSAGES, MESSAGES } from '@/constants/user'

export function useUsers(initialUsers?: User[]) {
  const [usersState, setUsersState] = useState<UsersState>({
    users: initialUsers ?? [],
    isLoading: initialUsers ? false : true,
    isSaving: false,
    deletingIds: new Set()
  })

  const [editState, setEditState] = useState<EditUserState>({
    editingUser: null,
    editForm: {
      name: '',
      email: '',
      role: 'user',
      userGroup: 'default',
      password: ''
    },
    isUpdating: false,
    showPassword: false
  })

  // No client-side user loading when initialUsers are provided

  // Initialize form for editing
  const handleEditUser = useCallback((user: User) => {
    setEditState({
      editingUser: user,
      editForm: {
        name: user.name,
        email: user.email,
        role: user.role,
        userGroup: user.userGroup,
        password: ''
      },
      isUpdating: false,
      showPassword: false
    })
  }, [])

  // Update edit form
  const updateEditForm = useCallback((field: keyof EditUserForm, value: string) => {
    setEditState(prev => ({
      ...prev,
      editForm: { ...prev.editForm, [field]: value }
    }))
  }, [])

  // Save user changes
  const updateUser = useCallback(async () => {
    if (!editState.editingUser) return

    try {
      setEditState(prev => ({ ...prev, isUpdating: true }))

      const updateData: UpdateUserData = {
        id: editState.editingUser.id,
        name: editState.editForm.name,
        email: editState.editForm.email,
        role: editState.editForm.role,
        userGroup: editState.editForm.userGroup,
        ...(editState.editForm.password && { password: editState.editForm.password })
      }

      const response = await fetch(API_ENDPOINTS.USER_UPDATE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        throw new Error('Failed to update user')
      }

      const updatedUser = await response.json()

      // Update user in state
      setUsersState(prev => ({
        ...prev,
        users: prev.users.map(user =>
          user.id === editState.editingUser!.id ? updatedUser : user
        )
      }))

      // Close edit dialog
      setEditState(prev => ({ ...prev, editingUser: null }))

      toast.success(TOAST_MESSAGES.USER_UPDATED)
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error(TOAST_MESSAGES.USER_UPDATE_FAILED)
    } finally {
      setEditState(prev => ({ ...prev, isUpdating: false }))
    }
  }, [editState.editingUser, editState.editForm])

  // Save only profile image URL
  const updateUserImage = useCallback(async (url: string) => {
    if (!editState.editingUser) return
    const userId = editState.editingUser.id
    const prevUrl = editState.editingUser.profilePicture

    // Optimistic update
    setEditState(prev => prev.editingUser ? ({
      ...prev,
      editingUser: { ...prev.editingUser, profilePicture: url }
    }) : prev)

    try {
      const response = await fetch(API_ENDPOINTS.USER_UPDATE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, image: url } satisfies UpdateUserData)
      })
      if (!response.ok) throw new Error('Failed to update user image')
      const updatedUser: User = await response.json()

      // Sync into users list and editing user
      setUsersState(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === userId ? updatedUser : u)
      }))
      setEditState(prev => prev.editingUser ? ({
        ...prev,
        editingUser: { ...updatedUser },
        // keep current form intact
        editForm: prev.editForm
      }) : prev)
    } catch (error) {
      console.error(error)
      // Revert optimistic change
      setEditState(prev => prev.editingUser ? ({
        ...prev,
        editingUser: { ...prev.editingUser, profilePicture: prevUrl }
      }) : prev)
      toast.error(TOAST_MESSAGES.USER_UPDATE_FAILED)
    }
  }, [editState.editingUser])

  // Delete user
  const deleteUser = useCallback(async (userId: string) => {
    try {
      setUsersState(prev => ({
        ...prev,
        deletingIds: new Set([...prev.deletingIds, userId])
      }))

      const response = await fetch(`${API_ENDPOINTS.USER_DELETE}/${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      // Remove user from state
      setUsersState(prev => ({
        ...prev,
        users: prev.users.filter(user => user.id !== userId),
        deletingIds: new Set([...prev.deletingIds].filter(id => id !== userId))
      }))

      toast.success(TOAST_MESSAGES.USER_DELETED)
    } catch (error) {
      console.error('Error deleting user:', error)
      setUsersState(prev => ({
        ...prev,
        deletingIds: new Set([...prev.deletingIds].filter(id => id !== userId))
      }))
      toast.error(TOAST_MESSAGES.USER_DELETE_FAILED)
    }
  }, [])

  // Toggle password visibility
  const togglePasswordVisibility = useCallback(() => {
    setEditState(prev => ({
      ...prev,
      showPassword: !prev.showPassword
    }))
  }, [])

  // No client fetch on mount; users are provided from server

  return {
    // State
    users: usersState.users,
    isLoading: usersState.isLoading,
    isSaving: usersState.isSaving,
    deletingIds: usersState.deletingIds,
    editingUser: editState.editingUser,
    editForm: editState.editForm,
    isUpdating: editState.isUpdating,
    showPassword: editState.showPassword,

    // Actions
    handleEditUser,
    updateEditForm,
    updateUser,
    updateUserImage,
    deleteUser,
    togglePasswordVisibility,
    setEditState
  }
}
