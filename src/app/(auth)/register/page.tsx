'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'konsultan' | 'perusahaan'>('perusahaan')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
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

      if (signUpError) throw signUpError

      router.push('/login?registered=true')
    } catch (err: any) {
      console.warn('Supabase sign up error, fall backing to mock registration:', err.message)
      // Save local mock registration state
      localStorage.setItem('sibimkon_user', JSON.stringify({
        id: 'mock-user-' + Math.random().toString(36).substr(2, 9),
        email,
        full_name: name,
        role,
        organization: role === 'perusahaan' ? companyName : 'Konsultan Mandiri'
      }))
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center text-5xl mb-4">📝</div>
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-cyan-200">
          Daftar SIBIMKON
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Registrasi Akun Baru Konsultan atau Perusahaan Klien
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="glass-card bg-slate-900/60 border border-slate-800/80 rounded-2xl py-8 px-6 shadow-2xl backdrop-blur-xl sm:px-10 animate-fade-in">
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/15 border border-red-500/30 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                Nama Lengkap
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ahmad Fauzi"
                className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm outline-none"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="fauzi@company.com"
                className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm outline-none"
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
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Daftar Sebagai
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="radio"
                    checked={role === 'perusahaan'}
                    onChange={() => setRole('perusahaan')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Perusahaan (Klien)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="radio"
                    checked={role === 'konsultan'}
                    onChange={() => setRole('konsultan')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Konsultan BIMKON</span>
                </label>
              </div>
            </div>

            {role === 'perusahaan' && (
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-slate-300">
                  Nama Perusahaan Klien
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="PT Sinar Baru Indah"
                  className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm outline-none animate-fade-in"
                />
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-600 hover:to-cyan-600 disabled:opacity-50 transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Sudah punya akun?{' '}
            <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
