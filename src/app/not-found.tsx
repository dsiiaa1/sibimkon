'use client'

import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, SearchX } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-990 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center">
            <SearchX className="h-10 w-10 text-slate-600" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-3">
          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
            404 — Halaman Tidak Ditemukan
          </span>
          <h1 className="text-2xl font-black text-slate-100 mt-4">
            Halaman ini tidak ada
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
            URL yang Anda akses tidak ditemukan. Mungkin sudah dipindah, dihapus, atau Anda salah mengetik alamatnya.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm font-semibold rounded-xl text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold rounded-xl text-white transition-colors cursor-pointer shadow-md"
          >
            <Home className="h-4 w-4" />
            Ke Dashboard
          </button>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-slate-600">
          SIBIMKON — Sistem Informasi Bimbingan Konsultansi Kemnaker RI
        </p>
      </div>
    </div>
  )
}
