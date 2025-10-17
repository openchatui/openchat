"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import { deleteUser } from '@/lib/client/api/users'

export function useDeleteUser() {
  return useApiMutation<string, void>(deleteUser)
}


