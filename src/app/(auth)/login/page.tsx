'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff, Building2, User, CheckCircle2, ArrowRight } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleSelection, setRoleSelection] = useState<'perusahaan' | 'konsultan'>('perusahaan')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      // Show check success if redirected from register
      setError(null)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Email atau password salah. Pastikan akun Anda sudah terdaftar.')
        }
        throw new Error(signInError.message)
      }

      if (!user) {
        throw new Error('Gagal mendapatkan data pengguna. Silakan coba lagi.')
      }

      let fullName = user.user_metadata?.full_name || 'Pengguna Smart Productive'
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

      if (userRole !== roleSelection) {
        console.warn(`User role in DB is ${userRole}, but logged in as ${roleSelection}`)
      }

      localStorage.setItem(
        'smartproductive_user',
        JSON.stringify({
          id: user.id,
          email: user.email,
          full_name: fullName,
          role: userRole,
          organization: org,
        })
      )

      router.push(searchParams.get('redirect') || '/dashboard')
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
    <div className="w-full max-w-md mx-auto">
      {/* Mobile logo & tagline */}
      <div className="lg:hidden flex flex-col items-center mb-6">
        <Image src="/sibimkonicon.png" alt="Logo" width={40} height={40} className="h-10 w-10 object-contain" />
        <h2 className="mt-2 text-center text-xl font-black text-[#0a1628]">
          Smart Productive
        </h2>
        <p className="mt-1.5 text-center text-xs text-slate-500 leading-relaxed max-w-xs">
          Enterprise Productivity Management System
        </p>
      </div>

      {/* Desktop welcome header */}
      <div className="hidden lg:block mb-8">
        <h2 className="text-3xl font-black text-[#0f172a] tracking-tight">
          Selamat Datang
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Silakan masuk ke akun Anda untuk mengelola bimbingan produktivitas.
        </p>
      </div>

      {/* Role Tab Selector */}
      <div className="mb-8 bg-slate-100/80 p-1.5 rounded-2xl flex gap-1 shadow-inner border border-slate-200/50">
        <button
          type="button"
          onClick={() => setRoleSelection('perusahaan')}
          className={`relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${
            roleSelection === 'perusahaan'
              ? 'bg-white text-[#0a1628] shadow-[0_2px_10px_rgba(0,0,0,0.06)]'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <Building2 className={`h-4 w-4 transition-colors ${roleSelection === 'perusahaan' ? 'text-amber-500' : 'text-slate-400'}`} />
          Perusahaan (Klien)
        </button>
        <button
          type="button"
          onClick={() => setRoleSelection('konsultan')}
          className={`relative flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${
            roleSelection === 'konsultan'
              ? 'bg-white text-[#0a1628] shadow-[0_2px_10px_rgba(0,0,0,0.06)]'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          <User className={`h-4 w-4 transition-colors ${roleSelection === 'konsultan' ? 'text-amber-500' : 'text-slate-400'}`} />
          Konsultan
        </button>
      </div>

      {/* Toast / Status box */}
      {searchParams.get('registered') === 'true' && !error && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-800 flex items-start gap-3 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Pendaftaran Berhasil!</p>
            <p className="mt-0.5 text-emerald-600">Akun Anda sudah aktif. Silakan masuk.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 flex items-start gap-2.5 animate-fade-in">
          <span className="text-base leading-none">⚠️</span>
          <p className="font-semibold leading-relaxed">{error}</p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        {/* Email Address */}
        <div>
          <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Alamat Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={roleSelection === 'perusahaan' ? 'nama@perusahaan.com' : 'konsultan@bimkon.com'}
              className="block w-full rounded-xl pl-11 pr-4 py-3.5 bg-slate-100 border border-transparent text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all duration-300 outline-none shadow-sm"
              style={{ color: '#1e293b' }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Kata Sandi
            </label>
            <Link
              href="/reset-password"
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
            >
              Lupa password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full rounded-xl pl-11 pr-11 py-3.5 bg-slate-100 border border-transparent text-slate-800 placeholder-slate-400 text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all duration-300 outline-none shadow-sm"
              style={{ color: '#1e293b' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500/30 transition-all cursor-pointer"
          />
          <label htmlFor="remember-me" className="ml-2.5 block text-xs font-bold" style={{ color: '#475569' }}>
            Ingat Sesi Masuk Saya
          </label>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center items-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-300 cursor-pointer bg-gradient-to-r from-[#0a1628] to-[#1e3a66] hover:shadow-lg hover:shadow-[#0a1628]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative z-10 flex items-center gap-2">
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Memproses Masuk...</span>
              </>
            ) : (
              <>
                <span>Masuk Aplikasi</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
            </span>
          </button>
        </div>
      </form>

      {/* Register callout */}
      <p className="mt-8 text-center text-xs text-slate-500">
        Belum terdaftar?{' '}
        <Link 
          href="/register" 
          className="font-bold text-[#0a1628] hover:text-amber-600 hover:underline transition-all"
        >
          Daftar Akun Baru
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen w-full bg-[#050a18]">
      
      {/* LEFT COLUMN: BRANDING & ILLUST (Navy & Gold) */}
      <div className="hidden lg:flex lg:col-span-7 relative overflow-hidden bg-gradient-to-br from-[#050a18] via-[#09142c] to-[#040814] border-r border-slate-800/60 text-white">
        {/* Glow decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-r from-amber-500/10 to-transparent blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-l from-[#1e4080]/15 to-transparent blur-[80px] pointer-events-none" />
        
        {/* Content Wrapper (Centered to reduce gap to the right column) */}
        <div className="w-full max-w-2xl mx-auto flex flex-col justify-between p-12 z-10 h-full relative">
          
          {/* Top Branding Logo */}
          <div className="flex items-center gap-4">
            <Image src="/sibimkonicon.png" alt="Logo" width={40} height={40} className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                Smart Productive
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">
                Link Productive
              </p>
            </div>
          </div>

          {/* Center Mockup Info/Graphics */}
          <div className="max-w-md my-auto space-y-6">
            <div className="space-y-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 inline-block tracking-widest uppercase">
                Metodologi DMAIC
              </span>
              <h2 className="text-3xl font-extrabold leading-tight text-white">
                Transformasi Bisnis secara Terukur
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tingkatkan produktivitas perusahaan Anda melalui tahapan yang jelas, terstruktur, dan berbasis data.
              </p>
            </div>

            {/* Premium illustration box */}
            <div className="rounded-2xl p-6 border border-slate-700/50 relative overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.6) 0%, rgba(5,10,24,0.4) 100%)', backdropFilter: 'blur(12px)' }}>
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">SIKLUS PROYEK</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase tracking-wider">Tahap Aktif</span>
              </div>
              
              {/* DMAIC flow visualization */}
              <div className="flex justify-between items-center relative py-2">
                {/* Connecting line */}
                <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-slate-800 z-0" />
                <div className="absolute top-[18px] left-[10%] w-[60%] h-[2px] bg-gradient-to-r from-amber-600 to-amber-400 z-0 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />

                {['D', 'M', 'A', 'I', 'C'].map((phase, idx) => {
                  const active = idx === 3 // I (Improve) is active
                  const completed = idx < 3
                  return (
                    <div key={phase} className="relative z-10 flex flex-col items-center gap-2">
                      <div 
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                          active 
                            ? 'bg-amber-400 text-[#050a18] ring-[3px] ring-[#050a18] outline outline-2 outline-amber-400 scale-110 shadow-lg shadow-amber-400/40' 
                            : completed 
                              ? 'bg-amber-500 text-[#050a18] ring-[3px] ring-[#050a18]' 
                              : 'bg-slate-800 text-slate-500 ring-[3px] ring-[#050a18]'
                        }`}
                      >
                        {phase}
                      </div>
                      <span className={`text-[9px] font-bold tracking-wider ${active ? 'text-amber-400' : completed ? 'text-slate-300' : 'text-slate-600'}`}>
                        {idx === 0 ? 'Define' : idx === 1 ? 'Measure' : idx === 2 ? 'Analyze' : idx === 3 ? 'Improve' : 'Control'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer Brand Info */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/40 pt-6">
            <span>Smart Productive — Link Productive</span>
            <span>© 2026 Link Productive</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: WHITE FORM CONTAINER */}
      <div className="col-span-1 lg:col-span-5 flex flex-col justify-center py-12 px-6 sm:px-12 md:px-20 bg-white text-slate-900">
        <Suspense fallback={
          <div className="w-full flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0a1628]" />
            <p className="text-xs text-slate-450 mt-2">Memuat Halaman Masuk...</p>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
