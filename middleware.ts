import { NextResponse, type NextRequest } from 'next/server'
import { auth } from "@/lib/auth"
import type { ExtendedSession } from '@/lib/auth/auth.types'

export const config = {
  matcher: ['/admin/:path*'],
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin-only sections
  if (pathname.startsWith('/admin')) {
    const session = (await auth()) as ExtendedSession | null
    const role = session?.user?.role
    if (!role || (role.toLowerCase() !== 'admin')) {
      return NextResponse.rewrite(new URL('/404', request.url))
    }
  }

  return NextResponse.next()
}


