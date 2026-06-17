import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Check if Supabase env vars are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Public routes that don't require auth
  const publicPaths = ['/login', '/register', '/reset-password', '/']
  const isPublicPath = publicPaths.some(path =>
    request.nextUrl.pathname === path ||
    (path !== '/' && request.nextUrl.pathname.startsWith(path))
  )

  // Check demo session cookie
  const isDemoSession = request.cookies.get('sibimkon_demo_session')?.value === 'true'

  // If no Supabase config, allow demo mode or redirect to login
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isDemoSession || isPublicPath) {
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // User is authenticated if: has a valid Supabase session OR has a demo session cookie
    const isAuth = !!user || isDemoSession

    if (!isAuth && !isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (isAuth && isPublicPath && request.nextUrl.pathname !== '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  } catch (error) {
    // If Supabase auth fails, fall back to demo session check
    console.error('Proxy auth error:', error)
    if (!isDemoSession && !isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
