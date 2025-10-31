export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator'
} as const

export const USER_GROUPS = {
  DEFAULT: 'default',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise'
} as const

export const PLACEHOLDERS = {
  NAME: 'Enter full name',
  EMAIL: 'Enter email address',
  PASSWORD: 'Enter new password',
  SEARCH_USERS: 'Search users...'
} as const

export const API_ENDPOINTS = {
  USER_UPDATE: (id: string) => `/api/v1/users/${id}`,
  USER_DELETE: (id: string) => `/api/v1/users/${id}/delete`,
} as const

export const MESSAGES = {
  USERS_TITLE: 'Users',
  USERS_DESCRIPTION: 'Manage user accounts, roles, and permissions',
  LOADING_USERS: 'Loading users...',
  NO_USERS: 'No users found',
  NAME_LABEL: 'Name',
  EMAIL_LABEL: 'Email',
  ROLE_LABEL: 'Role',
  USER_GROUP_LABEL: 'User Group',
  PASSWORD_LABEL: 'New Password',
  LAST_ACTIVE_LABEL: 'Last Active',
  CREATED_AT_LABEL: 'Created',
  OAUTH_ID_LABEL: 'OAuth ID',
  ACTIONS_LABEL: 'Actions',
  SAVE: 'Save',
  SAVING: 'Saving...',
  DELETE: 'Delete',
  EDIT: 'Edit',
  CHATS: 'View Chats',
  DELETE_CONFIRM_TITLE: 'Delete User',
  DELETE_CONFIRM_MESSAGE: 'Are you sure you want to delete this user? This action cannot be undone.',
  CANCEL: 'Cancel',
  CONFIRM: 'Confirm'
} as const

export const TOAST_MESSAGES = {
  USERS_LOADED: 'Users loaded successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  USER_UPDATE_FAILED: 'Failed to update user',
  USER_DELETE_FAILED: 'Failed to delete user',
  USER_LOAD_FAILED: 'Failed to load users'
} as const

export const getEmailInitials = (email: string | null | undefined) => {
  if (typeof email !== 'string' || email.length === 0) return 'U'
  const [usernameRaw] = email.split('@')
  const username = (usernameRaw || '').trim()
  if (!username) return 'U'
  const parts = username.split('.').filter(Boolean)
  const letters = (parts.length > 0 ? parts : [username])
    .map(part => part.charAt(0).toUpperCase())
    .join('')
  const initials = letters.slice(0, 2)
  return initials || 'U'
}
