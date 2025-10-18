"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import { uploadProfileImage } from '@/lib/sdk/users'

export function useUploadUserProfileImage() {
  return useApiMutation<{ userId: string; file: File }, string>(async ({ userId, file }) => uploadProfileImage(userId, file))
}


