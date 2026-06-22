'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-5 text-center max-w-md">
        <div className="text-5xl">⚠️</div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-200">Terjadi Kesalahan</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error.message || 'Gagal memuat halaman. Periksa koneksi internet atau coba lagi.'}
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold rounded-xl text-white transition-colors cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  )
}
