"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import { updateGroup, type UpdateGroupInput } from '@/lib/client/groups'

export function useUpdateGroup() {
  return useApiMutation<UpdateGroupInput, void>(updateGroup)
}


