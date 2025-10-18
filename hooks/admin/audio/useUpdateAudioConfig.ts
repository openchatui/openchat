"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import { updateAudioConfig, type UpdateAudioConfigInput } from '@/lib/api/audio'

export function useUpdateAudioConfig() {
  return useApiMutation<UpdateAudioConfigInput, void>(updateAudioConfig)
}


