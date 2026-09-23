'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff } from 'lucide-react'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  // Supabase automatically parses the hash fragment from the URL and logs the user in if the reset token is valid.
  // We just need to call updateUser() to set the new password.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.')
      return
    }

    if (password.length < 6) {
      setError('Password harus minimal 6 karakter.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
      
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah password. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-cyan-200">
          Buat Password Baru
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Silakan masukkan password baru Anda.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="glass-card bg-slate-900/60 border border-slate-800/80 rounded-2xl py-8 px-6 shadow-2xl backdrop-blur-xl sm:px-10 animate-fade-in">
          {success ? (
            <div className="text-center space-y-4">
              <div className="text-5xl text-emerald-400">✓</div>
              <h3 className="text-xl font-bold text-white">Password Berhasil Diubah!</h3>
              <p className="text-slate-300">Anda akan diarahkan ke halaman login dalam 3 detik...</p>
              <Link href="/login" className="inline-block mt-4 text-indigo-400 hover:text-indigo-300 font-semibold">
                Kembali ke Login Sekarang
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Password Baru
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-10 py-3 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                  Konfirmasi Password
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950/60 pl-10 pr-10 py-3 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-600 hover:to-cyan-600 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
