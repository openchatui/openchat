"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import { updateUser, type UpdateUserInput } from '@/lib/sdk/users'

export function useUpdateUser() {
  return useApiMutation<UpdateUserInput, void>(updateUser)
}


