"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import { updateModelAccess } from '@/lib/client/groups'

export function useUpdateModelAccess() {
  return useApiMutation<{ groupId: string; selection: Record<string, { read: boolean; write: boolean }> }, void>(updateModelAccess)
}


