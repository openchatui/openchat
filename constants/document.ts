export const DOCUMENT_MESSAGES = {
  LOADING: 'Loading document...',
  ERROR: 'Failed to load document',
  UNAUTHORIZED: 'You do not have permission to access this document',
  NOT_FOUND: 'Document not found',
  CREATED: 'Document created successfully',
  UPDATED: 'Document updated successfully',
  DELETED: 'Document deleted successfully',
  SHARED: 'Document shared successfully',
  PERMISSION_UPDATED: 'Permission updated successfully',
  PERMISSION_REMOVED: 'Permission removed successfully',
  COMMENT_ADDED: 'Comment added successfully',
  COMMENT_DELETED: 'Comment deleted successfully',
  VERSION_CREATED: 'Version saved successfully',
} as const

export const DOCUMENT_TAGS = {
  LIST: 'documents:list',
  DETAIL: (id: string) => `documents:${id}`,
  PERMISSIONS: (id: string) => `documents:${id}:permissions`,
  COMMENTS: (id: string) => `documents:${id}:comments`,
  VERSIONS: (id: string) => `documents:${id}:versions`,
} as const

export const USER_COLORS = [
  '#6c5ce7', // purple
  '#0984e3', // blue
  '#00b894', // green
  '#fdcb6e', // yellow
  '#e17055', // orange
  '#fd79a8', // pink
  '#a29bfe', // light purple
  '#74b9ff', // light blue
  '#55efc4', // mint
  '#ffeaa7', // light yellow
] as const

export const DEFAULT_DOCUMENT_TITLE = 'Untitled Document'

