import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * GET /api/auth/me
 *
 * Membaca user + role dari Supabase session (server-side, tidak bisa dimanipulasi
 * dari browser). Urutan prioritas:
 *   1. Supabase session (JWT cookie) → tabel profiles → role
 *   2. user_metadata dari Supabase auth (fallback jika profiles belum ada)
 *   3. 401 jika tidak ada session valid
 *
 * Response (200):
 *   { id, email, full_name, role, organization }
 *
 * Response (401):
 *   { error: "Unauthorized" }
 *
 * Response (503):
 *   { error: "Supabase not configured" }  ← demo/offline mode
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Demo / offline mode — Supabase tidak dikonfigurasi
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    // Buat response yang bisa di-set cookie-nya (SSR cookie handling)
    let response = NextResponse.next()

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

    // Verifikasi session — getUser() memakai JWT, tidak bisa di-spoof dari client
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ambil role dari tabel profiles (sumber kebenaran utama)
    let role: string = user.user_metadata?.role || 'perusahaan'
    let fullName: string = user.user_metadata?.full_name || 'Pengguna SIBIMKON'
    let organization: string = user.user_metadata?.company_name || ''

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, organization')
        .eq('id', user.id)
        .single()

      if (profile) {
        role = profile.role || role
        fullName = profile.full_name || fullName
        organization = profile.organization || organization
      }
    } catch {
      // profiles table tidak ada atau error — pakai user_metadata sebagai fallback
    }

    return NextResponse.json({
      id: user.id,
      email: user.email ?? '',
      full_name: fullName,
      role,
      organization,
    })
  } catch (err) {
    console.error('[/api/auth/me]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
