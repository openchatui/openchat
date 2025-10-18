"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import { createGroup, type CreateGroupInput } from '@/lib/api/groups'

export function useCreateGroup() {
  return useApiMutation<CreateGroupInput, { id: string }>(createGroup)
}


