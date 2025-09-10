import { auth } from '@/lib/auth'
import { extractApiKeyFromHeaders, resolveUserIdFromApiKey } from '@/lib/apiKeys'

export async function authenticateRequest(headers: Headers): Promise<{ userId: string | null, via: 'session' | 'apiKey' | 'none' }> {
  const session = await auth()
  if (session?.user?.id) return { userId: session.user.id, via: 'session' }

  const key = extractApiKeyFromHeaders(headers)
  if (key) {
    const userId = await resolveUserIdFromApiKey(key)
    if (userId) return { userId, via: 'apiKey' }
  }

  return { userId: null, via: 'none' }
}


