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

  startNewChat: (firstMessage: string, model: Model) => Promise<string>
  addMessage: (message: UIMessage<MessageMetadata>) => void
  setMessages: (messages: UIMessage<MessageMetadata>[]) => void
  setCurrentChatId: (chatId: string | null) => void
  resetChat: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentChatId: null,
  messages: [],
  isInitialState: true,

  startNewChat: async (firstMessage: string, model: Model) => {
    const tempId = `temp-${Date.now()}`
    const providerModelId = (model as any).providerId || model.id

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
        }
      }
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



