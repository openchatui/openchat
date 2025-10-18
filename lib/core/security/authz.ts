import 'server-only'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { JWT } from 'next-auth/jwt'

export async function fetchToken(request: NextRequest): Promise<JWT | null> {
  return getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
}

export function readStringField(obj: unknown, key: string): string | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined
  const value = (obj as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

export function getUserIdFromToken(token: JWT | null): string | undefined {
  if (!token) return undefined
  return typeof token.sub === 'string' ? token.sub : readStringField(token, 'id')
}

export function isAdminToken(token: JWT | null): boolean {
  const role = readStringField(token, 'role')
  return role === 'ADMIN'
}

export function isOwnerOrAdmin(token: JWT | null, userId: string): boolean {
  const currentUserId = getUserIdFromToken(token)
  return currentUserId === userId || isAdminToken(token)
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return true
  try {
    const originHost = new URL(origin).host
    return originHost === host
  } catch {
    return false
  }
}


