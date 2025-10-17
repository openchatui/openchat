"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import { updateUser, type UpdateUserInput } from '@/lib/client/users'

export function useUpdateUser() {
  return useApiMutation<UpdateUserInput, void>(updateUser)
}


