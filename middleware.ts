import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Route yang memerlukan autentikasi
const PROTECTED_PREFIXES = ['/dashboard', '/projects', '/companies', '/profile', '/admin']
// Route yang hanya untuk user yang belum login
const AUTH_ROUTES = ['/login', '/register', '/reset-password']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  // Guard: jika env vars tidak ada, jangan crash — cek demo session cookie
  if (!supabaseUrl || !supabaseAnonKey) {
    const isDemoSession = request.cookies.get('sibimkon_demo_session')?.value === 'true'
    if (isProtected && !isDemoSession) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next({ request: { headers: request.headers } })
  }

  // Buat response yang bisa dimodifikasi cookie-nya
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  try {
    // Buat Supabase client dengan akses cookies
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    // Ambil session user
    const { data: { user } } = await supabase.auth.getUser()

    // User belum login mencoba akses halaman protected → redirect ke login
    if (isProtected && !user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // User sudah login mencoba akses auth routes → redirect ke dashboard
    if (isAuthRoute && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch (err) {
    console.error('Middleware Supabase auth error:', err)
    // Jika Supabase error, cek demo session sebagai fallback
    const isDemoSession = request.cookies.get('sibimkon_demo_session')?.value === 'true'
    if (isProtected && !isDemoSession) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match semua path kecuali:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (svg, png, jpg, dll)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
