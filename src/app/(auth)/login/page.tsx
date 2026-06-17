'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'konsultan' | 'perusahaan' | 'admin_disnaker' | 'admin_kemnaker'>('konsultan')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      if (user) {
        let fullName = user.user_metadata?.full_name || 'User SIBIMKON'
        let userRole = user.user_metadata?.role || 'konsultan'
        let org = user.user_metadata?.company_name || 'SIBIMKON'

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          if (profile) {
            fullName = profile.full_name || fullName
            userRole = profile.role || userRole
            org = profile.organization || org
          }
        } catch (err) {
          console.warn('Could not fetch profiles table, using metadata:', err)
        }

        localStorage.setItem(
          'sibimkon_user',
          JSON.stringify({
            id: user.id,
            email: user.email,
            full_name: fullName,
            role: userRole,
            organization: org,
          })
        )
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      console.warn('Supabase login failed, trying Demo Mode fallback:', err.message)
      // Fallback: Login with Demo mode
      handleDemoLogin()
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = () => {
    // Set mock user session in localStorage
    localStorage.setItem(
      'sibimkon_user',
      JSON.stringify({
        id: 'user-1',
        email: email || 'demo@sibimkon.go.id',
        full_name: 'Ahmad Consultant',
        role: role,
        organization: role === 'konsultan' ? 'Kemnaker RI' : 'PT Sinar Maju Tekstil',
      })
    )
    // Set cookie for Next.js middleware bypass
    // Use SameSite=Lax for cross-request compatibility on Vercel
    const isSecure = window.location.protocol === 'https:'
    const cookieStr = `sibimkon_demo_session=true; path=/; max-age=28800; SameSite=Lax${isSecure ? '; Secure' : ''}`
    document.cookie = cookieStr
    // Small delay to ensure cookie is written before navigation triggers middleware
    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 100)
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 text-white relative overflow-hidden" style={{background: 'linear-gradient(135deg, var(--navy-950) 0%, #080f22 50%, var(--dark-900) 100%)'}}>
      {/* Decorative gradient glowing spots */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full" style={{background: 'radial-gradient(circle, rgba(212,160,23,0.06) 0%, transparent 70%)', filter: 'blur(60px)'}} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full" style={{background: 'radial-gradient(circle, rgba(212,160,23,0.04) 0%, transparent 70%)', filter: 'blur(60px)'}} />
      {/* Gold line at top */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{background: 'linear-gradient(90deg, transparent, rgba(212,160,23,0.4), transparent)'}} />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg" style={{background: 'linear-gradient(135deg, #b8860b, #f4c430)', color: 'var(--navy-950)'}}>
            S
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold tracking-tight" style={{background: 'linear-gradient(135deg, #f4c430, #fce9a0, #d4a017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
          SIBIMKON
        </h2>
        <p className="mt-2 text-center text-sm" style={{color: 'var(--text-muted)'}}>
          Sistem Informasi Bimbingan Konsultansi Peningkatan Produktivitas
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="rounded-2xl py-8 px-6 sm:px-10 animate-fade-in" style={{background: 'rgba(10,22,40,0.80)', border: '1px solid var(--border-base)', boxShadow: '0 25px 60px rgba(0,0,0,0.50), inset 0 1px 0 rgba(212,160,23,0.06)', backdropFilter: 'blur(20px)'}}>
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/15 border border-red-500/30 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="mt-1 block w-full rounded-xl px-4 py-3 sm:text-sm transition-all outline-none" style={{background: 'rgba(5,10,24,0.8)', border: '1px solid var(--border-base)', color: 'var(--text-primary)'}}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full rounded-xl px-4 py-3 sm:text-sm transition-all outline-none" style={{background: 'rgba(5,10,24,0.8)', border: '1px solid var(--border-base)', color: 'var(--text-primary)'}}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>
                Pilih Role (Untuk Demo Mode)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'konsultan', name: 'Konsultan' },
                  { id: 'perusahaan', name: 'Perusahaan' },
                  { id: 'admin_disnaker', name: 'Disnaker' },
                  { id: 'admin_kemnaker', name: 'Kemnaker' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id as any)}
                    style={role === item.id ? {
                      border: '1px solid rgba(212,160,23,0.55)',
                      background: 'rgba(212,160,23,0.15)',
                      color: 'var(--gold-400)',
                      fontWeight: 700
                    } : {
                      border: '1px solid var(--border-base)',
                      background: 'rgba(5,10,24,0.5)',
                      color: 'var(--text-muted)'
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  style={{borderColor: 'var(--border-base)', background: 'var(--navy-900)', accentColor: 'var(--gold-400)'}}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm" style={{color: 'var(--text-muted)'}}>
                  Ingat Saya
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/reset-password"
                  className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Lupa password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50 transition-all cursor-pointer transform hover:-translate-y-0.5"
                style={{background: 'linear-gradient(135deg, #b8860b, #d4a017, #f4c430)', color: 'var(--navy-950)', boxShadow: '0 6px 24px rgba(212,160,23,0.30)'}}
              >
                {loading ? 'Mengautentikasi...' : 'Masuk Aplikasi'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{borderTop: '1px solid var(--border-base)'}} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2" style={{background: 'transparent', color: 'var(--text-muted)'}}>Atau gunakan</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="flex w-full justify-center items-center rounded-xl px-4 py-3 text-sm font-semibold transition-all cursor-pointer"
                style={{border: '1px dashed rgba(212,160,23,0.35)', background: 'rgba(212,160,23,0.04)', color: 'var(--gold-300)'}}
              >
                Masuk Instan dengan Demo Mode ⚡
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs" style={{color: 'var(--text-muted)'}}>
            Belum terdaftar?{' '}
            <Link href="/register" className="font-semibold transition-colors" style={{color: 'var(--gold-400)'}}>
              Daftar Perusahaan Baru
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
