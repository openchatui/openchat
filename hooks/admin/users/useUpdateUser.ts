"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import { updateUser, type UpdateUserInput } from '@/lib/api/users'
import type { User } from '@/types/user.types'

export function useUpdateUser() {
  return useApiMutation<UpdateUserInput, User>(updateUser)
}


