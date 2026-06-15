'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-cyan-200">
          Reset Password SIBIMKON
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
                  className="flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-600 hover:to-cyan-600 transition-all cursor-pointer"
                >
                  Kirim Instruksi Reset
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
