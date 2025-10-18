"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import { setElevenLabsApiKey } from '@/lib/api/audio'

export function useSetElevenLabsApiKey() {
  return useApiMutation<string, void>(setElevenLabsApiKey)
}


