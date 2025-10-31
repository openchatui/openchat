import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const config = {
  matcher: ['/admin/:path*'],
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin-only sections
  if (pathname.startsWith('/admin')) {
    // Debug: Check what cookies we're receiving
    const cookies = request.cookies.getAll()
    const cookieNames = cookies.map(c => c.name)
    const sessionCookie = cookies.find(c => 
      c.name.includes('session-token') || 
      c.name.includes('next-auth') ||
      c.name.startsWith('authjs.session-token') ||
      c.name.startsWith('__Secure-authjs.session-token')
    )
    
    const secret = process.env.AUTH_SECRET
    
    const token = await getToken({ 
      req: request, 
      secret,
      secureCookie: request.nextUrl.protocol === 'https:',
    }).catch(err => {
      console.error('[Middleware] getToken error:', err)
      return null
    })
    
    const role = token?.role
    if (!role || (typeof role === 'string' && role.toLowerCase() !== 'admin')) {
      console.log('[Middleware] Access denied - role check failed')
      return NextResponse.rewrite(new URL('/404', request.url))
    }
    
    console.log('[Middleware] Access granted')
  }

  return NextResponse.next()
}


