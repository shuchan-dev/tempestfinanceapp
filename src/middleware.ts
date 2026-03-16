import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('tempest_session')?.value
  const { pathname } = request.nextUrl

  // Allow access to auth-related routes and public assets
  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname.startsWith('/api/auth');

  if (!sessionToken && !isPublicRoute) {
    // Redirect unauthenticated users to the login page
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (sessionToken && (pathname === '/login' || pathname === '/register')) {
    // Redirect authenticated users away from login/register
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - manifest.json, sw.js (PWA files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json|manifest.webmanifest|icon|apple-icon|sw.js).*)',
  ],
}
