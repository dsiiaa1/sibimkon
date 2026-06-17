'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'konsultan' | 'perusahaan'>('perusahaan')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Validasi password cocok
    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter.')
      setLoading(false)
      return
    }
    if (role === 'perusahaan' && !companyName.trim()) {
      setError('Nama perusahaan wajib diisi untuk akun Perusahaan.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role,
            company_name: role === 'perusahaan' ? companyName : undefined,
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          throw new Error('Email ini sudah terdaftar. Silakan login atau gunakan email lain.')
        }
        throw new Error(signUpError.message)
      }

      // Upsert profil ke tabel profiles
      if (data?.user) {
        try {
          const { error: profileErr } = await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: name,
            email: email,
            role: role,
            organization: role === 'perusahaan' ? companyName : 'Konsultan BIMKON',
            is_active: true,
          }, { onConflict: 'id' })

          if (profileErr) {
            console.warn('Profile insert warning:', profileErr)
          }
        } catch (profileErr) {
          console.warn('Profile insert failed (trigger may handle it):', profileErr)
        }
      }

      // Tampilkan pesan sukses — arahkan ke login
      setSuccess(
        data?.user?.identities?.length === 0
          ? 'Email ini sudah terdaftar. Silakan login.'
          : 'Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi, lalu login.'
      )

      // Redirect ke login setelah 3 detik
      setTimeout(() => {
        router.push('/login?registered=true')
      }, 3000)

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 text-white relative overflow-hidden" style={{background: 'linear-gradient(135deg, var(--navy-950) 0%, #080f22 50%, var(--dark-900) 100%)'}}>
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full" style={{background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', filter: 'blur(80px)'}} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full" style={{background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', filter: 'blur(80px)'}} />
      <div className="absolute top-0 left-0 right-0 h-px" style={{background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)'}} />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg" style={{background: 'linear-gradient(135deg, #b8860b, #f4c430)', color: 'var(--navy-950)'}}>
            S
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold tracking-tight" style={{background: 'linear-gradient(135deg, #f4c430, #fce9a0, #d4a017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
          Daftar SIBIMKON
        </h2>
        <p className="mt-2 text-center text-sm" style={{color: 'var(--text-muted)'}}>
          Registrasi Akun Baru — Konsultan atau Perusahaan Klien
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="rounded-2xl py-8 px-6 sm:px-10 animate-fade-in" style={{background: 'rgba(10,22,40,0.80)', border: '1px solid var(--border-base)', boxShadow: '0 25px 60px rgba(0,0,0,0.50)', backdropFilter: 'blur(20px)'}}>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/15 border border-red-500/30 p-3 text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-green-500/15 border border-green-500/30 p-4 text-sm text-green-400">
              <div className="font-semibold mb-1">✅ Berhasil!</div>
              {success}
              <div className="mt-2 text-xs opacity-75">Mengalihkan ke halaman login dalam 3 detik...</div>
            </div>
          )}

          {!success && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  className="mt-1 block w-full rounded-xl px-4 py-3 sm:text-sm transition-all outline-none"
                  style={{background: 'rgba(5,10,24,0.8)', border: '1px solid var(--border-base)', color: 'var(--text-primary)'}}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@perusahaan.com"
                  className="mt-1 block w-full rounded-xl px-4 py-3 sm:text-sm transition-all outline-none"
                  style={{background: 'rgba(5,10,24,0.8)', border: '1px solid var(--border-base)', color: 'var(--text-primary)'}}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                  Password <span className="text-xs opacity-60">(min. 6 karakter)</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 block w-full rounded-xl px-4 py-3 sm:text-sm transition-all outline-none"
                  style={{background: 'rgba(5,10,24,0.8)', border: '1px solid var(--border-base)', color: 'var(--text-primary)'}}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                  Konfirmasi Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 block w-full rounded-xl px-4 py-3 sm:text-sm transition-all outline-none"
                  style={{background: 'rgba(5,10,24,0.8)', border: '1px solid var(--border-base)', color: 'var(--text-primary)'}}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>
                  Daftar Sebagai
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'perusahaan', label: '🏭 Perusahaan (Klien)' },
                    { id: 'konsultan', label: '👤 Konsultan BIMKON' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRole(item.id as 'perusahaan' | 'konsultan')}
                      className="px-3 py-3 rounded-xl text-sm font-medium transition-all"
                      style={role === item.id ? {
                        border: '1px solid rgba(212,160,23,0.55)',
                        background: 'rgba(212,160,23,0.12)',
                        color: 'var(--gold-400)',
                        fontWeight: 700,
                      } : {
                        border: '1px solid var(--border-base)',
                        background: 'rgba(5,10,24,0.5)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {role === 'perusahaan' && (
                <div className="animate-fade-in">
                  <label htmlFor="companyName" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                    Nama Perusahaan <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="PT Nama Perusahaan Anda"
                    className="mt-1 block w-full rounded-xl px-4 py-3 sm:text-sm transition-all outline-none"
                    style={{background: 'rgba(5,10,24,0.8)', border: '1px solid var(--border-base)', color: 'var(--text-primary)'}}
                  />
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-50 transition-all cursor-pointer transform hover:-translate-y-0.5"
                  style={{background: 'linear-gradient(135deg, #b8860b, #d4a017, #f4c430)', color: 'var(--navy-950)', boxShadow: '0 6px 24px rgba(212,160,23,0.25)'}}
                >
                  {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-xs" style={{color: 'var(--text-muted)'}}>
            Sudah punya akun?{' '}
            <Link href="/login" className="font-semibold transition-colors" style={{color: 'var(--gold-400)'}}>
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
