export type UserRole = 'admin' | 'user' | 'moderator'
export type UserGroup = 'default' | 'premium' | 'enterprise' // Placeholder for future groups

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  userGroup: UserGroup
  profilePicture?: string
  lastActive?: string
  createdAt: string
  oauthId?: string
  updatedAt?: string
}

export interface CreateUserData {
  name: string
  email: string
  role: UserRole
  userGroup: UserGroup
  password?: string
}

export interface UpdateUserData extends Partial<CreateUserData> {
  id: string
}

export interface EditUserForm {
  name: string
  email: string
  role: UserRole
  userGroup: UserGroup
  password?: string
}

export interface UsersState {
  users: User[]
  isLoading: boolean
  isSaving: boolean
  deletingIds: Set<string>
}

export interface EditUserState {
  editingUser: User | null
  editForm: EditUserForm
  isUpdating: boolean
  showPassword: boolean
}

export interface UserTableProps {
  users: User[]
  isLoading: boolean
  onEditUser: (user: User) => void
  onDeleteUser: (userId: string) => void
  onViewChats?: (userId: string) => void
}
