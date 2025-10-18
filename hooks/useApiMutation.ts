"use client"

import { useCallback, useState } from 'react'

export function useApiMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (input: TInput): Promise<TResult> => {
    setError(null)
    setIsLoading(true)
    try {
      const result = await fn(input)
      return result
    } catch (e: any) {
      setError(e?.message || 'Request failed')
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [fn])

  return { mutate, isLoading, error }
}


