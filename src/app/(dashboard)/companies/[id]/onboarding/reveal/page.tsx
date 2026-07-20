'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ChevronRight, Activity, TrendingUp, Building } from 'lucide-react'
import { getCompanies, updateCompany } from '@/lib/db'
import { Company } from '@/lib/mockData'

export default function RevealPage() {
  const { id } = useParams()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAnimation, setShowAnimation] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!id) return
      try {
        const companies = await getCompanies()
        const comp = companies.find(c => c.id === id)
        if (comp) {
          setCompany(comp)
        }
      } catch (err) {
        console.error('Error fetching company:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  useEffect(() => {
    // Hide analysis animation after 2.5 seconds
    const timer = setTimeout(() => {
      setShowAnimation(false)
    }, 2500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return <div className="min-h-[80vh] flex items-center justify-center text-slate-400">Memuat data...</div>
  }

  if (!company) {
    return <div className="p-8 text-center text-slate-400">Perusahaan tidak ditemukan.</div>
  }

  if (showAnimation) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="absolute inset-0 border-4 border-t-[var(--gold-400)] border-r-transparent border-b-[var(--gold-400)] border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-4 border-r-indigo-500 border-l-indigo-500 border-t-transparent border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          <div className="h-24 w-24 rounded-full bg-slate-800 flex items-center justify-center z-10 relative">
            <Activity className="h-8 w-8 text-[var(--gold-400)] animate-pulse" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-200 animate-pulse">Sistem sedang menganalisis profil Anda...</h2>
        <p className="text-slate-400 text-sm max-w-sm text-center">
          Kami menyesuaikan alur kerja DMAIC agar paling efektif dan efisien untuk ukuran bisnis Anda.
        </p>
      </div>
    )
  }

  const getTierDetails = (tier: string) => {
    switch(tier) {
      case 'simple':
        return {
          title: 'Tier Kecil (UMKM)',
          desc: 'Cocok untuk perusahaan dengan operasional gesit. Kami telah menyederhanakan alur DMAIC menjadi 3 langkah mudah: Cari Tahu Masalah, Jalankan Perbaikan, dan Pantau Hasilnya. Anda juga dapat menginput angka secara manual tanpa perlu repot menyiapkan file Excel yang rumit.',
          icon: <Activity className="h-12 w-12 text-indigo-400" />,
          bg: 'bg-indigo-500/10',
          border: 'border-indigo-500/30'
        }
      case 'menengah':
        return {
          title: 'Tier Menengah',
          desc: 'Cocok untuk perusahaan menengah. Anda akan menggunakan standar DMAIC 11 langkah yang komprehensif dengan dukungan upload file dan analisis prediktif untuk menyelesaikan masalah yang lebih kompleks.',
          icon: <TrendingUp className="h-12 w-12 text-amber-400" />,
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30'
        }
      case 'besar':
        return {
          title: 'Tier Besar',
          desc: 'Dirancang untuk perusahaan besar dengan data operasional yang masif. Alur DMAIC 11 langkah diaktifkan penuh dengan opsi analisis data terpusat dan pelaporan mendalam.',
          icon: <Building className="h-12 w-12 text-[var(--gold-400)]" />,
          bg: 'bg-[var(--gold-400)]/10',
          border: 'border-[var(--gold-400)]/30'
        }
      default:
        return {
          title: 'Tier Menengah',
          desc: 'Anda akan menggunakan standar DMAIC 11 langkah.',
          icon: <TrendingUp className="h-12 w-12 text-amber-400" />,
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30'
        }
    }
  }

  const details = getTierDetails(company.tier || 'menengah')

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
      <div className="text-center space-y-6 mb-12">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-500/20 mb-4">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Kuesioner Berhasil Disubmit</h1>
        <p className="text-slate-400">Terima kasih telah melengkapi baseline assessment.</p>
      </div>

      <div className={`p-8 rounded-2xl border ${details.border} ${details.bg} shadow-lg backdrop-blur-sm relative overflow-hidden`}>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          {details.icon}
        </div>
        
        <div className="relative z-10 space-y-4">
          <p className="text-sm font-semibold tracking-wider uppercase text-slate-300">Hasil Analisis Otomatis</p>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            Perusahaan Anda Masuk Kategori {details.title}
          </h2>
          <p className="text-slate-300 leading-relaxed max-w-lg">
            {details.desc}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-500 hover:bg-slate-700/50 transition-all group"
        >
          <div className="flex flex-col text-left">
            <span className="font-semibold text-slate-200 group-hover:text-white">Masuk ke Dashboard Profiling</span>
            <span className="text-sm text-slate-400">Mulai langkah perbaikan operasional Anda</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center group-hover:bg-[var(--gold-400)] transition-colors">
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-900" />
          </div>
        </button>
        
        <div className="text-center pt-6">
          <p className="text-xs text-slate-500">
            Merasa segmentasi tier ini tidak sesuai dengan kondisi riil?{' '}
            <Link href={`/companies/${company.id}/request-review`} className="text-[var(--gold-400)] hover:underline">
              Ajukan Peninjauan Tier
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
