import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth/auth'

export const config = {
  matcher: ['/admin/:path*'],
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin-only sections
  if (pathname.startsWith('/admin')) {
    const session = await auth()
    const role = (session as any)?.user?.role
    if (!role || (role !== 'ADMIN' && role !== 'admin')) {
      return NextResponse.rewrite(new URL('/404', request.url))
    }
  }

  return NextResponse.next()
}


