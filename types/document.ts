export type DocumentRole = 'VIEWER' | 'COMMENTER' | 'EDITOR' | 'OWNER'

export interface Document {
  id: string
  title: string
  ownerId: string
  icon?: string | null
  coverImage?: string | null
  isPublished: boolean
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DocumentWithPermissions extends Document {
  userRole?: DocumentRole
  owner: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export interface DocumentPermission {
  id: string
  documentId: string
  userId?: string | null
  email?: string | null
  role: DocumentRole
  createdAt: Date
  updatedAt: Date
  user?: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export interface Comment {
  id: string
  documentId: string
  userId: string
  content: string
  startPos?: number | null
  endPos?: number | null
  isResolved: boolean
  parentId?: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  replies?: Comment[]
}

export interface DocumentVersion {
  id: string
  documentId: string
  userId: string
  title: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
  }
}

export interface CollaborationUser {
  id: string
  name: string
  email: string
  avatar?: string | null
  color: string
}

