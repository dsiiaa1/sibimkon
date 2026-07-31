import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ─── Route Groups ─────────────────────────────────────────────────────────────
const PROTECTED_PREFIXES = ['/dashboard', '/projects', '/companies', '/profile', '/admin']
const AUTH_ROUTES        = ['/login', '/register', '/reset-password']

/** API routes yang memanggil AI (mahal & lambat) */
const AI_API_PREFIXES = [
  '/api/charter-draft',
  '/api/measure-analyze',
  '/api/measure-analyze-data',
  '/api/measure-interpret',
  '/api/measure-data-needed',
  '/api/analyze-ai',
  '/api/analyze-priority-ai',
  '/api/improve-ai',
  '/api/control-efficiency',
  '/api/generate-action-steps',
  '/api/generate-pptx',
  '/api/onboarding-analyze',
  '/api/validate-pqcdsm',
  '/api/ai-consultant',
]

// ─── In-Memory Rate Limiter (Sliding Window) ──────────────────────────────────
// Catatan Vercel/Serverless: berjalan per-instance, sudah cukup untuk mencegah
// abuse tunggal. Untuk enterprise-scale, ganti dengan Upstash Redis.
interface WindowEntry { count: number; windowStart: number }
const rlStore = new Map<string, WindowEntry>()

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const existing = rlStore.get(key)

  if (!existing || now - existing.windowStart >= windowMs) {
    rlStore.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, resetIn: Math.ceil(windowMs / 1000) }
  }

  existing.count++
  rlStore.set(key, existing)
  const remaining = Math.max(0, limit - existing.count)
  const resetIn   = Math.ceil((existing.windowStart + windowMs - now) / 1000)
  return { allowed: existing.count <= limit, remaining, resetIn }
}

// Bersihkan store lama setiap 10 menit
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of rlStore.entries()) {
    if (now - v.windowStart > 20 * 60 * 1000) rlStore.delete(k)
  }
}, 10 * 60 * 1000)

// ─── Security Headers (OWASP) ─────────────────────────────────────────────────
function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-DNS-Prefetch-Control', 'on')
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return res
}

// ─── Middleware ────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Dapatkan IP klien — Vercel meneruskan IP asli melalui header ini
  const clientIp =
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'

  // ── Rate Limiting: AI Routes — 15 req / 60 detik ──────────────────────────
  const isAiRoute = AI_API_PREFIXES.some(p => pathname.startsWith(p))
  if (isAiRoute) {
    const rl = checkRateLimit(`ai:${clientIp}`, 15, 60 * 1000)
    if (!rl.allowed) {
      const res = NextResponse.json(
        { error: 'Terlalu banyak permintaan. Silakan tunggu sebentar sebelum mencoba lagi.', retryAfter: rl.resetIn },
        { status: 429 }
      )
      res.headers.set('Retry-After', String(rl.resetIn))
      res.headers.set('X-RateLimit-Limit', '15')
      res.headers.set('X-RateLimit-Remaining', '0')
      return applySecurityHeaders(res)
    }
  }

  // ── Rate Limiting: Auth Routes — 10 percobaan / 15 menit ──────────────────
  const isAuthApi = pathname.startsWith('/api/auth')
  if (isAuthApi) {
    const rl = checkRateLimit(`auth:${clientIp}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      const res = NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Silakan coba lagi setelah beberapa menit.', retryAfter: rl.resetIn },
        { status: 429 }
      )
      res.headers.set('Retry-After', String(rl.resetIn))
      return applySecurityHeaders(res)
    }
  }

  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isProtected = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  // Guard: jika env vars tidak ada, cek demo session cookie
  if (!supabaseUrl || !supabaseAnonKey) {
    const isDemoSession = request.cookies.get('smartproductive_demo_session')?.value === 'true'
    if (isProtected && !isDemoSession) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return applySecurityHeaders(NextResponse.redirect(loginUrl))
    }
    return applySecurityHeaders(NextResponse.next({ request: { headers: request.headers } }))
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    if (isProtected && !user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return applySecurityHeaders(NextResponse.redirect(loginUrl))
    }

    if (isAuthRoute && user) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)))
    }
  } catch (err) {
    console.error('Middleware Supabase auth error:', err)
    const isDemoSession = request.cookies.get('smartproductive_demo_session')?.value === 'true'
    if (isProtected && !isDemoSession) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return applySecurityHeaders(NextResponse.redirect(loginUrl))
    }
  }

  return applySecurityHeaders(response)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
