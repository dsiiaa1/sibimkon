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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
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
    <div className="flex min-h-screen flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
      {/* Decorative gradient glowing spots */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center text-5xl mb-4">🛡️</div>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-cyan-200">
          SIBIMKON
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Sistem Informasi Bimbingan Konsultansi Peningkatan Produktivitas
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="glass-card bg-slate-900/60 border border-slate-800/80 rounded-2xl py-8 px-6 shadow-2xl backdrop-blur-xl sm:px-10 animate-fade-in">
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
                className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all outline-none"
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
                className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
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
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      role === item.id
                        ? 'border-indigo-500 bg-indigo-500/20 text-white'
                        : 'border-slate-800 bg-slate-950/30 text-slate-400 hover:bg-slate-850'
                    }`}
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
                  className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">
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
                className="flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-cyan-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                {loading ? 'Mengautentikasi...' : 'Masuk Aplikasi'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-slate-900/60 px-2 text-slate-400">Atau gunakan</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="flex w-full justify-center items-center rounded-xl border border-dashed border-slate-700 bg-slate-950/20 px-4 py-3 text-sm font-medium text-indigo-300 hover:bg-slate-950/40 hover:text-white transition-all cursor-pointer"
              >
                Masuk Instan dengan Demo Mode ⚡
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Belum terdaftar?{' '}
            <Link href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Daftar Perusahaan Baru
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
