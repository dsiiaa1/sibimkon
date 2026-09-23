'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password/update`,
      })

      if (resetError) throw resetError
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim link reset password. Pastikan email terdaftar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-cyan-200">
          Reset Password Smart Productive
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="glass-card bg-slate-900/60 border border-slate-800/80 rounded-2xl py-8 px-6 shadow-2xl backdrop-blur-xl sm:px-10 animate-fade-in">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">✉️</div>
              <p className="text-slate-300">Link reset password telah dikirim ke {email}. Silakan cek kotak masuk atau spam email Anda.</p>
              <Link href="/login" className="inline-block mt-4 text-indigo-400 hover:text-indigo-300 font-semibold">
                Kembali ke Login
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
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                  Masukkan Email Akun Anda
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="fauzi@company.com"
                  className="mt-1 block w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm outline-none"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-600 hover:to-cyan-600 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Memproses...' : 'Kirim Instruksi Reset'}
                </button>
              </div>

              <div className="text-center mt-4">
                <Link href="/login" className="text-sm text-slate-400 hover:text-slate-300">
                  Kembali ke login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
