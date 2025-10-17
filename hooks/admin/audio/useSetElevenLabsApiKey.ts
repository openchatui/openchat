"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import { setElevenLabsApiKey } from '@/lib/client/api/audio'

export function useSetElevenLabsApiKey() {
  return useApiMutation<string, void>(setElevenLabsApiKey)
}


