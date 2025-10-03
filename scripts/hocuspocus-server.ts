#!/usr/bin/env tsx
import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { Logger } from '@hocuspocus/extension-logger'
import * as Y from 'yjs'
import db from '../lib/db'
import { verify } from 'jsonwebtoken'

const PORT = Number(process.env.HOCUSPOCUS_PORT ?? 1234)
const TOKEN_SECRET = process.env.TOKEN_SECRET ?? 'supersecret-secret'

/**
 * Hocuspocus Collaboration Server for Google Docs Clone
 * 
 * Features:
 * - Real-time collaboration with Y.js CRDT
 * - JWT authentication
 * - Postgres persistence
 * - User presence tracking
 */

const server = new Server({
  name: 'docs-collab',
  port: PORT,
  timeout: 30000,
  debounce: 10000,
  maxDebounce: 30000,
  quiet: false,

  extensions: [
    new Logger(),
    new Database({
      /**
       * Fetch document from database on first connection
       */
      fetch: async ({ documentName }) => {
        try {
          console.log(`[Hocuspocus] Fetching document: ${documentName}`)
          
          // Load document content from DB
          const doc = await db.document.findUnique({
            where: { id: documentName },
            select: { content: true },
          })

          if (!doc || !doc.content) {
            console.log(`[Hocuspocus] No content found for ${documentName}`)
            return null
          }

          return new Uint8Array(doc.content)
        } catch (error) {
          console.error(`[Hocuspocus] Error fetching document ${documentName}:`, error)
          return null
        }
      },

      /**
       * Store document to database
       */
      store: async ({ documentName, state }) => {
        try {
          console.log(`[Hocuspocus] Storing document: ${documentName}`)
          
          // Convert Y.js state to HTML for search/preview
          const ydoc = new Y.Doc()
          Y.applyUpdate(ydoc, state)
          
          // Get text content from Y.js doc (you can enhance this to get rich HTML)
          const ytext = ydoc.getText('default')
          const htmlSnapshot = ytext.toString()

          // Save to database
          await db.document.update({
            where: { id: documentName },
            data: {
              content: Buffer.from(state),
              htmlSnapshot: htmlSnapshot || null,
              updatedAt: new Date(),
            },
          })

          console.log(`[Hocuspocus] Document ${documentName} stored successfully`)
        } catch (error) {
          console.error(`[Hocuspocus] Error storing document ${documentName}:`, error)
          throw error
        }
      },
    }),
  ],

  /**
   * Authenticate connection using JWT token
   */
  async onAuthenticate(data) {
    const { token, documentName } = data
    
    if (!token) {
      throw new Error('Authentication token required')
    }

    try {
      // Verify JWT token
      const decoded = verify(token, TOKEN_SECRET) as { userId: string; email: string }
      
      if (!decoded.userId) {
        throw new Error('Invalid token: missing userId')
      }

      console.log(`[Hocuspocus] User ${decoded.userId} authenticating for document ${documentName}`)

      // Check if user has access to document
      const doc = await db.document.findFirst({
        where: {
          id: documentName,
          OR: [
            { ownerId: decoded.userId },
            { permissions: { some: { userId: decoded.userId } } },
            { isPublished: true },
          ],
        },
        include: {
          permissions: {
            where: { userId: decoded.userId },
            select: { role: true },
          },
        },
      })

      if (!doc) {
        throw new Error('Document not found or access denied')
      }

      // Determine user role
      const userRole = doc.ownerId === decoded.userId ? 'OWNER' : (doc.permissions[0]?.role ?? 'VIEWER')
      
      // Store user context for later use
      data.context = {
        userId: decoded.userId,
        email: decoded.email,
        documentId: documentName,
        role: userRole,
      }

      console.log(`[Hocuspocus] User ${decoded.userId} authenticated with role ${userRole}`)
    } catch (error) {
      console.error('[Hocuspocus] Authentication failed:', error)
      throw new Error('Authentication failed')
    }
  },

  /**
   * Handle connection established
   */
  async onConnect(data) {
    const { context, documentName, socketId } = data
    console.log(`[Hocuspocus] User ${context?.userId} connected to ${documentName} (socket: ${socketId})`)
  },

  /**
   * Handle disconnection
   */
  async onDisconnect(data) {
    const { context, documentName, socketId } = data
    console.log(`[Hocuspocus] User ${context?.userId} disconnected from ${documentName} (socket: ${socketId})`)
  },

  /**
   * Handle document changes
   */
  async onChange(data) {
    const { documentName, context } = data
    console.log(`[Hocuspocus] Document ${documentName} changed by user ${context?.userId}`)
  },

  /**
   * Handle errors
   */
  async onLoadDocument({ documentName }) {
    console.log(`[Hocuspocus] Loading document: ${documentName}`)
  },

  /**
   * Create document if it doesn't exist
   */
  async onCreateDocument({ documentName }) {
    console.log(`[Hocuspocus] Creating new Y.js document state for: ${documentName}`)
    // Return empty Y.js doc
    return new Uint8Array()
  },
})

server.listen()

// Handle graceful shutdown
const shutdown = async () => {
  console.log('\n[Hocuspocus] Shutting down gracefully...')
  await server.destroy()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

