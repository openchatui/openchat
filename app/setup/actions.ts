"use server"

import { AuthActionsService } from "@/lib/auth"
import { redirect } from "next/navigation"

export type ActionState =
  | { status: 'idle'; fields?: Record<string, string> }
  | { status: 'success'; message?: string; fields?: Record<string, string> }
  | { status: 'error'; message: string; fields?: Record<string, string> }

export async function createAdminAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const res = await AuthActionsService.signUp(formData)
    if (!res?.success) {
      // Preserve non-sensitive fields
      return {
        status: 'error',
        message: res?.message || 'Failed to create admin user',
        fields: {
          username: String(formData.get('username') || ''),
          email: String(formData.get('email') || ''),
        },
      }
    }
    // Redirect to login after successful admin creation
    redirect('/login?message=' + encodeURIComponent('Admin account created successfully! Please sign in.'))
  } catch (e: any) {
    // Re-throw redirect errors
    if (e && typeof e === 'object' && 'digest' in e && String(e.digest).startsWith('NEXT_REDIRECT')) {
      throw e
    }
    return {
      status: 'error',
      message: e?.message || 'Failed to create admin user',
      fields: {
        username: String(formData.get('username') || ''),
        email: String(formData.get('email') || ''),
      },
    }
  }
}



