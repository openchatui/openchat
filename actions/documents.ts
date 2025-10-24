'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { DocumentDbService } from '@/lib/modules/documents/db.service'
import { DOCUMENT_MESSAGES, DOCUMENT_TAGS } from '@/constants/document'
import type { DocumentRole } from '@/types/document.types'

export type ActionResult =
  | { status: 'success'; data?: any }
  | { status: 'error'; message: string }

/**
 * Get user's documents
 */
export async function getUserDocuments() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  return await DocumentDbService.getUserDocuments(session.user.id)
}

/**
 * Get document by ID
 */
export async function getDocument(documentId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const doc = await DocumentDbService.getDocument(documentId, session.user.id)
  if (!doc) throw new Error(DOCUMENT_MESSAGES.NOT_FOUND)

  return doc
}

/**
 * Create document
 */
const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(200),
})

export async function createDocumentAction(
  prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = CreateDocumentSchema.parse({
      title: formData.get('title'),
    })

    const doc = await DocumentDbService.createDocument(session.user.id, parsed.title)

    revalidateTag(DOCUMENT_TAGS.LIST)
    redirect(`/docs/${doc.id}`)
  } catch (error: any) {
    if (error?.message === 'NEXT_REDIRECT') throw error
    return { status: 'error', message: error?.message || 'Failed to create document' }
  }
}

/**
 * Update document
 */
const UpdateDocumentSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  icon: z.string().optional(),
  coverImage: z.string().url().optional(),
  isPublished: z.boolean().optional(),
})

export async function updateDocumentAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = UpdateDocumentSchema.parse({
      documentId: formData.get('documentId'),
      title: formData.get('title'),
      icon: formData.get('icon'),
      coverImage: formData.get('coverImage'),
      isPublished: formData.get('isPublished') === 'true',
    })

    const { documentId, ...updates } = parsed

    await DocumentDbService.updateDocument(documentId, session.user.id, updates)

    revalidateTag(DOCUMENT_TAGS.DETAIL(documentId))
    revalidateTag(DOCUMENT_TAGS.LIST)
    revalidatePath(`/docs/${documentId}`)

    return { status: 'success', data: { message: DOCUMENT_MESSAGES.UPDATED } }
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Failed to update document' }
  }
}

/**
 * Delete document
 */
const DeleteDocumentSchema = z.object({
  documentId: z.string().uuid(),
})

export async function deleteDocumentAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = DeleteDocumentSchema.parse({
      documentId: formData.get('documentId'),
    })

    await DocumentDbService.deleteDocument(parsed.documentId, session.user.id)

    revalidateTag(DOCUMENT_TAGS.DETAIL(parsed.documentId))
    revalidateTag(DOCUMENT_TAGS.LIST)
    revalidatePath('/docs')

    return { status: 'success', data: { message: DOCUMENT_MESSAGES.DELETED } }
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Failed to delete document' }
  }
}

/**
 * Get document permissions
 */
export async function getDocumentPermissions(documentId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  return await DocumentDbService.getDocumentPermissions(documentId, session.user.id)
}

/**
 * Add permission
 */
const AddPermissionSchema = z.object({
  documentId: z.string().uuid(),
  userIdOrEmail: z.string().min(1),
  role: z.enum(['VIEWER', 'COMMENTER', 'EDITOR']),
})

export async function addPermissionAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = AddPermissionSchema.parse({
      documentId: formData.get('documentId'),
      userIdOrEmail: formData.get('userIdOrEmail'),
      role: formData.get('role'),
    })

    await DocumentDbService.addPermission(
      parsed.documentId,
      session.user.id,
      parsed.userIdOrEmail,
      parsed.role as DocumentRole
    )

    revalidateTag(DOCUMENT_TAGS.PERMISSIONS(parsed.documentId))

    return { status: 'success', data: { message: DOCUMENT_MESSAGES.SHARED } }
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Failed to add permission' }
  }
}

/**
 * Update permission
 */
const UpdatePermissionSchema = z.object({
  permissionId: z.string().uuid(),
  role: z.enum(['VIEWER', 'COMMENTER', 'EDITOR']),
})

export async function updatePermissionAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = UpdatePermissionSchema.parse({
      permissionId: formData.get('permissionId'),
      role: formData.get('role'),
    })

    await DocumentDbService.updatePermission(parsed.permissionId, session.user.id, parsed.role as DocumentRole)

    return { status: 'success', data: { message: DOCUMENT_MESSAGES.PERMISSION_UPDATED } }
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Failed to update permission' }
  }
}

/**
 * Remove permission
 */
const RemovePermissionSchema = z.object({
  permissionId: z.string().uuid(),
})

export async function removePermissionAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = RemovePermissionSchema.parse({
      permissionId: formData.get('permissionId'),
    })

    await DocumentDbService.removePermission(parsed.permissionId, session.user.id)

    return { status: 'success', data: { message: DOCUMENT_MESSAGES.PERMISSION_REMOVED } }
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Failed to remove permission' }
  }
}

/**
 * Get document comments
 */
export async function getDocumentComments(documentId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  return await DocumentDbService.getDocumentComments(documentId, session.user.id)
}

/**
 * Add comment
 */
const AddCommentSchema = z.object({
  documentId: z.string().uuid(),
  content: z.string().min(1),
  startPos: z.number().optional(),
  endPos: z.number().optional(),
  parentId: z.string().uuid().optional(),
})

export async function addCommentAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = AddCommentSchema.parse({
      documentId: formData.get('documentId'),
      content: formData.get('content'),
      startPos: formData.get('startPos') ? Number(formData.get('startPos')) : undefined,
      endPos: formData.get('endPos') ? Number(formData.get('endPos')) : undefined,
      parentId: formData.get('parentId') || undefined,
    })

    await DocumentDbService.addComment(
      parsed.documentId,
      session.user.id,
      parsed.content,
      parsed.startPos,
      parsed.endPos,
      parsed.parentId
    )

    revalidateTag(DOCUMENT_TAGS.COMMENTS(parsed.documentId))

    return { status: 'success', data: { message: DOCUMENT_MESSAGES.COMMENT_ADDED } }
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Failed to add comment' }
  }
}

/**
 * Resolve comment
 */
const ResolveCommentSchema = z.object({
  commentId: z.string().uuid(),
})

export async function resolveCommentAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = ResolveCommentSchema.parse({
      commentId: formData.get('commentId'),
    })

    await DocumentDbService.resolveComment(parsed.commentId, session.user.id)

    return { status: 'success' }
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Failed to resolve comment' }
  }
}

/**
 * Delete comment
 */
const DeleteCommentSchema = z.object({
  commentId: z.string().uuid(),
})

export async function deleteCommentAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = DeleteCommentSchema.parse({
      commentId: formData.get('commentId'),
    })

    await DocumentDbService.deleteComment(parsed.commentId, session.user.id)

    return { status: 'success', data: { message: DOCUMENT_MESSAGES.COMMENT_DELETED } }
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Failed to delete comment' }
  }
}

/**
 * Get document versions
 */
export async function getDocumentVersions(documentId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  return await DocumentDbService.getDocumentVersions(documentId, session.user.id)
}

/**
 * Create version snapshot
 */
const CreateVersionSchema = z.object({
  documentId: z.string().uuid(),
  title: z.string().min(1).max(200),
})

export async function createVersionAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { status: 'error', message: 'Unauthorized' }

    const parsed = CreateVersionSchema.parse({
      documentId: formData.get('documentId'),
      title: formData.get('title'),
    })

    // Load current document content
    const content = await DocumentDbService.loadDocumentContent(parsed.documentId)
    if (!content) return { status: 'error', message: 'Document content not found' }

    await DocumentDbService.createVersion(parsed.documentId, session.user.id, parsed.title, content)

    revalidateTag(DOCUMENT_TAGS.VERSIONS(parsed.documentId))

    return { status: 'success', data: { message: DOCUMENT_MESSAGES.VERSION_CREATED } }
  } catch (error: any) {
    return { status: 'error', message: error?.message || 'Failed to create version' }
  }
}

