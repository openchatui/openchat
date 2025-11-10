"use client"

import { create } from 'zustand'
import type { UIMessage } from 'ai'
import type { Model } from '@/types/model.types'
import type { MessageMetadata } from '@/lib/modules/chat/chat.types'
import { createInitialChat } from '@/lib/api/chats'

interface ChatState {
  currentChatId: string | null
  messages: UIMessage<MessageMetadata>[]
  isInitialState: boolean

  startNewChat: (firstMessage: string, model: Model, attachedFiles?: Array<{ file: File; localId: string } | { fileId: string; fileName: string }>) => Promise<string>
  addMessage: (message: UIMessage<MessageMetadata>) => void
  setMessages: (messages: UIMessage<MessageMetadata>[]) => void
  setCurrentChatId: (chatId: string | null) => void
  resetChat: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentChatId: null,
  messages: [],
  isInitialState: true,

  startNewChat: async (firstMessage: string, model: Model, attachedFiles?: Array<{ file: File; localId: string } | { fileId: string; fileName: string }>) => {
    const tempId = `temp-${Date.now()}`
    const providerModelId = (model as any).providerId || model.id

    // Process attachments (both uploaded files and drive file references)
    const attachments: any[] = []
    if (attachedFiles && attachedFiles.length > 0) {
      for (const item of attachedFiles) {
        try {
          let fileId: string
          let fileName: string
          let fileType: string = 'application/octet-stream'
          
          // Check if it's an uploaded file or a drive file reference
          if ('file' in item) {
            // Uploaded file - upload it first
            const { file, localId } = item
            const formData = new FormData()
            formData.append('file', file)
            
            const uploadRes = await fetch('/api/v1/chat/attachments', {
              method: 'POST',
              body: formData
            })
            
            if (!uploadRes.ok) {
              console.error('Failed to upload file:', await uploadRes.text())
              continue
            }
            
            const uploadData = await uploadRes.json()
            if (!uploadData.ok || !uploadData.fileId) {
              console.error('Upload response missing file data:', uploadData)
              continue
            }
            
            fileId = uploadData.fileId
            fileName = uploadData.filename
            fileType = file.type
          } else {
            // Drive file reference - use the file ID directly
            fileId = item.fileId
            fileName = item.fileName
            // Try to infer type from filename
            if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
              fileType = 'image/' + (fileName.split('.').pop() || 'jpeg')
            } else if (fileName.endsWith('.pdf')) {
              fileType = 'application/pdf'
            }
          }
          
          // Get signed URL for external access (model API)
          const signedRes = await fetch(`/api/v1/drive/file/${fileId}/signed-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: fileName, ttlSec: 3600 })
          })
          
          if (!signedRes.ok) {
            console.error('Failed to get signed URL:', await signedRes.text())
            continue
          }
          
          const { url } = await signedRes.json()
          
          // For localhost, model APIs can't access URLs, so fall back to base64
          const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1')
          
          let fileData = url
          if (isLocalhost) {
            // Convert to base64 for localhost
            if ('file' in item) {
              // Uploaded file - read from File object
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                  const result = reader.result as string
                  resolve(result) // Keep full data URL
                }
                reader.onerror = reject
                reader.readAsDataURL(item.file)
              })
              fileData = base64
            } else {
              // Drive file reference - fetch and convert to base64
              try {
                const fetchRes = await fetch(`/api/v1/drive/file/${fileId}`)
                if (fetchRes.ok) {
                  const blob = await fetchRes.blob()
                  const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => {
                      const result = reader.result as string
                      resolve(result)
                    }
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                  })
                  fileData = base64
                }
              } catch (fetchErr) {
                console.error('Failed to fetch drive file for base64 conversion:', fetchErr)
              }
            }
          }
          
          // Store as attachment metadata
          if (fileType.startsWith('image/')) {
            attachments.push({
              type: 'image',
              image: fileData,
              mediaType: fileType,
              localId: 'localId' in item ? item.localId : undefined,
              fileId
            })
          } else {
            attachments.push({
              type: 'file',
              data: fileData,
              mediaType: fileType,
              filename: fileName,
              localId: 'localId' in item ? item.localId : undefined,
              fileId
            })
          }
        } catch (err) {
          console.error('Failed to process attachment:', err)
        }
      }
    }

    const userMessage: UIMessage<MessageMetadata> = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      role: 'user',
      parts: [{ type: 'text', text: firstMessage }],
      metadata: {
        createdAt: Date.now(),
        model: {
          id: providerModelId,
          name: model.name,
          profile_image_url: (model as any)?.meta?.profile_image_url || null,
        },
        attachments: attachments.length > 0 ? attachments : undefined
      } as any
    }

    set({ currentChatId: tempId, messages: [userMessage], isInitialState: false })

    try {
      const result = await createInitialChat({
        message: firstMessage,
        model: {
          id: model.id,
          name: model.name,
          profile_image_url: (model as any)?.meta?.profile_image_url || null,
        },
        attachments
      })
      const chatId: string = result.chatId
      set({ currentChatId: chatId })
      return chatId
    } catch (error) {
      set({ currentChatId: null, messages: [], isInitialState: true })
      throw error
    }
  },

  addMessage: (message) => {
    set(state => ({ messages: [...state.messages, message] }))
  },

  setMessages: (messages) => {
    set({ messages, isInitialState: false })
  },

  setCurrentChatId: (chatId) => {
    set({ currentChatId: chatId })
  },

  resetChat: () => {
    set({ currentChatId: null, messages: [], isInitialState: true })
  }
}))



