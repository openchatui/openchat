import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { isAuthEnabled } from '@/lib/auth/toggle'

export const config = {
  // Run middleware for all app routes except public assets and auth/setup pages
  matcher: [
    '/((?!api|_next|favicon.ico|images|files|docs|login|signup|setup|error).*)',
  ],
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes explicitly (defense-in-depth with matcher)
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/files') ||
    pathname.startsWith('/docs') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/error')
  ) {
    return NextResponse.next()
  }

  // Admin-only sections
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    const role = (token as any)?.role as string | undefined
    if (!role || role !== 'ADMIN') {
      return NextResponse.rewrite(new URL('/404', request.url))
    }
    return NextResponse.next()
  }

  // For all other application routes, enforce login when AUTH is enabled
  if (isAuthEnabled()) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}


