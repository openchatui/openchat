"use client"

import { useState, useEffect } from 'react'
import { ChatData } from '@/lib/features/chat'

export function useChats() {
  const [chats, setChats] = useState<ChatData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/v1/chats')
      if (!response.ok) {
        throw new Error('Failed to fetch chats')
      }
      
      const data = await response.json()
      setChats(data.chats || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chats')
      console.error('Error fetching chats:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const createChat = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/v1/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to create chat')
      }
      
      const data = await response.json()
      
      // Refresh the chats list
      await fetchChats()
      
      return data.chatId
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chat')
      console.error('Error creating chat:', err)
      return null
    }
  }

  const refreshChats = () => {
    fetchChats()
  }

  useEffect(() => {
    fetchChats()
  }, [])

  return {
    chats,
    isLoading,
    error,
    createChat,
    refreshChats,
  }
}
