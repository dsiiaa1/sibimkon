import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050a18]">
      <div className="flex flex-col items-center gap-6 text-center px-4">
        <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-100">Halaman Tidak Ditemukan</h1>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            Halaman yang kamu cari tidak ada atau sudah dipindahkan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #b8860b, #d4a017, #f4c430)', color: '#050a18' }}
          >
            Kembali ke Dashboard
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 transition-all"
          >
            Lihat Proyek
          </Link>
        </div>
      </div>
    </div>
  )
}
