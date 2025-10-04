"use server"

import { auth } from "@/lib/auth"
import { AuthActionsService } from "@/lib/auth"
import { createConnections } from "@/actions/connections"

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
    return { status: 'success', message: 'Admin account created. Please log in to continue.' }
  } catch (e: any) {
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

export async function saveOpenAIKeyAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { status: 'error', message: 'You must be logged in.' }
    }
    // Optional: only allow admins
    const role = (session as any)?.user?.role
    if (role && String(role).toUpperCase() !== 'ADMIN') {
      return { status: 'error', message: 'Only admins can set provider credentials.' }
    }

    const apiKey = String(formData.get('apiKey') || '').trim()
    const baseUrl = String(formData.get('baseUrl') || 'https://api.openai.com/v1').trim()
    if (!apiKey) return { status: 'error', message: 'API key is required.', fields: { baseUrl } }

    await createConnections([{ type: 'openai-api', baseUrl, apiKey }])

    return { status: 'success', message: 'OpenAI key saved successfully.' }
  } catch (e: any) {
    return { status: 'error', message: e?.message || 'Failed to save OpenAI key', fields: { baseUrl: String(formData.get('baseUrl') || '') } }
  }
}


