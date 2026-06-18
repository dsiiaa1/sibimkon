'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
        // Tampilkan pesan error yang jelas dan spesifik
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Email atau password salah. Pastikan akun Anda sudah terdaftar.')
        } else if (signInError.message.includes('Email not confirmed')) {
          throw new Error('Email belum diverifikasi. Silakan cek kotak masuk email Anda dan klik link verifikasi.')
        }
        throw new Error(signInError.message)
      }

      if (!user) {
        throw new Error('Gagal mendapatkan data pengguna. Silakan coba lagi.')
      }

      // Ambil data profil dari database — prioritaskan data DB di atas metadata
      let fullName = user.user_metadata?.full_name || 'Pengguna SIBIMKON'
      let userRole = user.user_metadata?.role || 'perusahaan'
      let org = user.user_metadata?.company_name || ''

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role, organization')
          .eq('id', user.id)
          .single()
        if (profile) {
          fullName = profile.full_name || fullName
          userRole = profile.role || userRole
          org = profile.organization || org
        }
      } catch (profileErr) {
        console.warn('Could not fetch profile from DB, using auth metadata:', profileErr)
      }

      // Simpan sesi pengguna yang valid ke localStorage
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

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      const msg = typeof err === 'string' ? err
        : err?.message ? err.message
        : err?.error_description ? err.error_description
        : JSON.stringify(err)
      setError(msg || 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
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
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
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
                placeholder="nama@perusahaan.com"
                className="mt-1 block w-full rounded-xl px-4 py-3 sm:text-sm transition-all outline-none"
                style={{background: 'rgba(5,10,24,0.8)', border: '1px solid var(--border-base)', color: 'var(--text-primary)'}}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
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
                className="mt-1 block w-full rounded-xl px-4 py-3 sm:text-sm transition-all outline-none"
                style={{background: 'rgba(5,10,24,0.8)', border: '1px solid var(--border-base)', color: 'var(--text-primary)'}}
              />
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

          <p className="mt-6 text-center text-xs" style={{color: 'var(--text-muted)'}}>
            Belum terdaftar?{' '}
            <Link href="/register" className="font-semibold transition-colors" style={{color: 'var(--gold-400)'}}>
              Daftar Akun Baru
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
