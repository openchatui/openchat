"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import { updateGroup, type UpdateGroupInput } from '@/lib/client/api/groups'

export function useUpdateGroup() {
  return useApiMutation<UpdateGroupInput, void>(updateGroup)
}


