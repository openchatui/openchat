import 'server-only'
import db from '@/lib/db'
import type { Document, DocumentWithPermissions, DocumentPermission, Comment, DocumentVersion, DocumentRole } from '@/types/document'

/**
 * Document Database Service
 */
export class DocumentDbService {
  /**
   * Get user's documents
   */
  static async getUserDocuments(userId: string): Promise<DocumentWithPermissions[]> {
    const documents = await db.document.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId } } },
        ],
        isArchived: false,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        permissions: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      ownerId: doc.ownerId,
      icon: doc.icon,
      coverImage: doc.coverImage,
      isPublished: doc.isPublished,
      isArchived: doc.isArchived,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      owner: doc.owner,
      userRole: doc.ownerId === userId ? 'OWNER' : (doc.permissions[0]?.role as DocumentRole),
    }))
  }

  /**
   * Get document by ID with permissions check
   */
  static async getDocument(documentId: string, userId: string): Promise<DocumentWithPermissions | null> {
    const doc = await db.document.findFirst({
      where: {
        id: documentId,
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId } } },
          { isPublished: true },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        permissions: {
          where: { userId },
          select: { role: true },
        },
      },
    })

    if (!doc) return null

    return {
      id: doc.id,
      title: doc.title,
      ownerId: doc.ownerId,
      icon: doc.icon,
      coverImage: doc.coverImage,
      isPublished: doc.isPublished,
      isArchived: doc.isArchived,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      owner: doc.owner,
      userRole: doc.ownerId === userId ? 'OWNER' : (doc.permissions[0]?.role as DocumentRole),
    }
  }

  /**
   * Create document
   */
  static async createDocument(userId: string, title: string): Promise<Document> {
    return await db.document.create({
      data: {
        title,
        ownerId: userId,
      },
    })
  }

  /**
   * Update document
   */
  static async updateDocument(
    documentId: string,
    userId: string,
    data: Partial<Pick<Document, 'title' | 'icon' | 'coverImage' | 'isPublished'>>
  ): Promise<Document> {
    // Check permission
    const hasAccess = await this.checkPermission(documentId, userId, 'EDITOR')
    if (!hasAccess) throw new Error('Unauthorized')

    return await db.document.update({
      where: { id: documentId },
      data,
    })
  }

  /**
   * Delete (archive) document
   */
  static async deleteDocument(documentId: string, userId: string): Promise<void> {
    // Only owner can delete
    const doc = await db.document.findFirst({
      where: { id: documentId, ownerId: userId },
    })
    if (!doc) throw new Error('Unauthorized')

    await db.document.update({
      where: { id: documentId },
      data: { isArchived: true },
    })
  }

  /**
   * Save Y.js document state
   */
  static async saveDocumentContent(documentId: string, content: Uint8Array, htmlSnapshot?: string): Promise<void> {
    await db.document.update({
      where: { id: documentId },
      data: {
        content: Buffer.from(content),
        htmlSnapshot,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Load Y.js document state
   */
  static async loadDocumentContent(documentId: string): Promise<Uint8Array | null> {
    const doc = await db.document.findUnique({
      where: { id: documentId },
      select: { content: true },
    })
    return doc?.content ? new Uint8Array(doc.content) : null
  }

  /**
   * Check if user has permission
   */
  static async checkPermission(documentId: string, userId: string, minRole: DocumentRole): Promise<boolean> {
    const roleHierarchy = { VIEWER: 0, COMMENTER: 1, EDITOR: 2, OWNER: 3 }
    const minLevel = roleHierarchy[minRole]

    const doc = await db.document.findFirst({
      where: {
        id: documentId,
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId } } },
        ],
      },
      include: {
        permissions: {
          where: { userId },
          select: { role: true },
        },
      },
    })

    if (!doc) return false
    if (doc.ownerId === userId) return true

    const userRole = doc.permissions[0]?.role
    if (!userRole) return false

    return roleHierarchy[userRole as DocumentRole] >= minLevel
  }

  /**
   * Get document permissions
   */
  static async getDocumentPermissions(documentId: string, userId: string): Promise<DocumentPermission[]> {
    // Check if user is owner
    const doc = await db.document.findFirst({
      where: { id: documentId, ownerId: userId },
    })
    if (!doc) throw new Error('Unauthorized')

    const permissions = await db.documentPermission.findMany({
      where: { documentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Map Prisma null user to undefined to satisfy DocumentPermission type
    return permissions.map((p) => ({
      id: p.id,
      documentId: p.documentId,
      userId: p.userId,
      email: p.email,
      role: p.role as DocumentRole,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      user: p.user ?? undefined,
    }))
  }

  /**
   * Add permission
   */
  static async addPermission(
    documentId: string,
    ownerId: string,
    userIdOrEmail: string,
    role: DocumentRole
  ): Promise<DocumentPermission> {
    // Check if requester is owner
    const doc = await db.document.findFirst({
      where: { id: documentId, ownerId },
    })
    if (!doc) throw new Error('Unauthorized')

    // Check if it's an email or userId
    const isEmail = userIdOrEmail.includes('@')
    const targetUser = isEmail ? null : await db.user.findUnique({ where: { id: userIdOrEmail } })

    const created = await db.documentPermission.create({
      data: {
        documentId,
        userId: targetUser?.id,
        email: isEmail ? userIdOrEmail : null,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return {
      id: created.id,
      documentId: created.documentId,
      userId: created.userId,
      email: created.email,
      role: created.role as DocumentRole,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      user: created.user ?? undefined,
    }
  }

  /**
   * Update permission
   */
  static async updatePermission(permissionId: string, ownerId: string, role: DocumentRole): Promise<void> {
    const permission = await db.documentPermission.findUnique({
      where: { id: permissionId },
      include: { document: true },
    })

    if (!permission || permission.document.ownerId !== ownerId) {
      throw new Error('Unauthorized')
    }

    await db.documentPermission.update({
      where: { id: permissionId },
      data: { role },
    })
  }

  /**
   * Remove permission
   */
  static async removePermission(permissionId: string, ownerId: string): Promise<void> {
    const permission = await db.documentPermission.findUnique({
      where: { id: permissionId },
      include: { document: true },
    })

    if (!permission || permission.document.ownerId !== ownerId) {
      throw new Error('Unauthorized')
    }

    await db.documentPermission.delete({
      where: { id: permissionId },
    })
  }

  /**
   * Get document comments
   */
  static async getDocumentComments(documentId: string, userId: string): Promise<Comment[]> {
    // Check permission
    const hasAccess = await this.checkPermission(documentId, userId, 'VIEWER')
    if (!hasAccess) throw new Error('Unauthorized')

    const comments = await db.comment.findMany({
      where: {
        documentId,
        parentId: null, // Only root comments
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return comments
  }

  /**
   * Add comment
   */
  static async addComment(
    documentId: string,
    userId: string,
    content: string,
    startPos?: number,
    endPos?: number,
    parentId?: string
  ): Promise<Comment> {
    // Check permission
    const hasAccess = await this.checkPermission(documentId, userId, 'COMMENTER')
    if (!hasAccess) throw new Error('Unauthorized')

    const comment = await db.comment.create({
      data: {
        documentId,
        userId,
        content,
        startPos,
        endPos,
        parentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return comment
  }

  /**
   * Resolve comment
   */
  static async resolveComment(commentId: string, userId: string): Promise<void> {
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: { document: true },
    })

    if (!comment) throw new Error('Comment not found')

    const hasAccess = await this.checkPermission(comment.documentId, userId, 'COMMENTER')
    if (!hasAccess) throw new Error('Unauthorized')

    await db.comment.update({
      where: { id: commentId },
      data: { isResolved: true },
    })
  }

  /**
   * Delete comment
   */
  static async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: { document: true },
    })

    if (!comment) throw new Error('Comment not found')

    // Only comment author or document owner can delete
    if (comment.userId !== userId && comment.document.ownerId !== userId) {
      throw new Error('Unauthorized')
    }

    await db.comment.delete({
      where: { id: commentId },
    })
  }

  /**
   * Create version snapshot
   */
  static async createVersion(
    documentId: string,
    userId: string,
    title: string,
    content: Uint8Array,
    htmlSnapshot?: string
  ): Promise<DocumentVersion> {
    const hasAccess = await this.checkPermission(documentId, userId, 'EDITOR')
    if (!hasAccess) throw new Error('Unauthorized')

    const version = await db.documentVersion.create({
      data: {
        documentId,
        userId,
        title,
        content: Buffer.from(content),
        htmlSnapshot,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return version
  }

  /**
   * Get document versions
   */
  static async getDocumentVersions(documentId: string, userId: string): Promise<DocumentVersion[]> {
    const hasAccess = await this.checkPermission(documentId, userId, 'VIEWER')
    if (!hasAccess) throw new Error('Unauthorized')

    const versions = await db.documentVersion.findMany({
      where: { documentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent 50 versions
    })

    return versions
  }

  /**
   * Restore version
   */
  static async restoreVersion(versionId: string, userId: string): Promise<Uint8Array> {
    const version = await db.documentVersion.findUnique({
      where: { id: versionId },
    })

    if (!version) throw new Error('Version not found')

    const hasAccess = await this.checkPermission(version.documentId, userId, 'EDITOR')
    if (!hasAccess) throw new Error('Unauthorized')

    return new Uint8Array(version.content)
  }
}

