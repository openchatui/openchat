import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const config = {
  matcher: ['/admin/:path*'],
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin-only sections
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET })
    const role = (token as any)?.role as string | undefined
    if (!role || role !== 'ADMIN') {
      return NextResponse.rewrite(new URL('/404', request.url))
    }
  }

  return NextResponse.next()
}


