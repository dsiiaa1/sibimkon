'use client'

/**
 * /awards — Halaman Productivity Awards
 *
 * Menampilkan ranking perusahaan berdasarkan rata-rata ROI dari proyek-proyek
 * yang berstatus 'completed' pada tahun yang dipilih.
 *
 * Akses: hanya role 'konsultan' dan 'admin'. Role 'perusahaan' di-redirect ke /dashboard.
 *
 * PRD reference: prd_productivity_awards.md §4
 */

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProjects, getCompanies, getActionPlansForProjects } from '@/lib/db'
import { Project, Company } from '@/lib/mockData'
import { calculateProjectRoi } from '@/lib/roi'
import { Trophy, Medal, Award, ChevronDown, Building2, TrendingUp, ArrowLeft } from 'lucide-react'

interface CompanyScore {
  companyId: string
  companyName: string
  avgRoi: number
  totalCostSaving: number
  totalInvestment: number
  projectCount: number
}

function formatRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`
  return `Rp ${n.toLocaleString('id-ID')}`
}

// ── Medal Card (Rank 1 / 2 / 3) ──────────────────────────────────────────────
function MedalCard({ score, rank }: { score: CompanyScore; rank: 1 | 2 | 3 }) {
  const config = {
    1: {
      label: 'Gold',
      gradient: 'linear-gradient(135deg, #78491b 0%, #c07e2a 40%, #f5b942 70%, #f7cc6a 100%)',
      border: 'border-yellow-600/40',
      bg: 'bg-yellow-950/15',
      glow: '0 20px 60px rgba(245,185,66,0.15)',
      icon: <Trophy className="h-8 w-8 text-yellow-400" />,
      iconBg: 'bg-yellow-500/15',
      roiColor: 'text-yellow-300',
      badge: '🥇',
    },
    2: {
      label: 'Silver',
      gradient: 'linear-gradient(135deg, #3a3a4a 0%, #888 40%, #ccc 70%, #ddd 100%)',
      border: 'border-slate-500/40',
      bg: 'bg-slate-800/20',
      glow: '0 20px 60px rgba(180,180,180,0.08)',
      icon: <Medal className="h-7 w-7 text-slate-300" />,
      iconBg: 'bg-slate-500/15',
      roiColor: 'text-slate-200',
      badge: '🥈',
    },
    3: {
      label: 'Bronze',
      gradient: 'linear-gradient(135deg, #5a2800 0%, #9a4a1a 40%, #cd7f32 70%, #d4925a 100%)',
      border: 'border-orange-700/40',
      bg: 'bg-orange-950/10',
      glow: '0 20px 60px rgba(205,127,50,0.10)',
      icon: <Award className="h-7 w-7 text-orange-400" />,
      iconBg: 'bg-orange-500/10',
      roiColor: 'text-orange-300',
      badge: '🥉',
    },
  }[rank]

  return (
    <div
      className={`rounded-3xl border ${config.border} ${config.bg} p-6 flex flex-col gap-4 relative overflow-hidden`}
      style={{ boxShadow: config.glow }}
    >
      {/* glow blob */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: config.gradient }} />

      <div className="flex items-center gap-3">
        <div className={`h-12 w-12 rounded-2xl ${config.iconBg} flex items-center justify-center shrink-0`}>
          {config.icon}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
            {config.badge} Rank #{rank} — {config.label}
          </div>
          <h3 className="text-base font-black text-slate-100 truncate mt-0.5">{score.companyName}</h3>
        </div>
      </div>

      <div className={`text-4xl font-black ${config.roiColor} tracking-tight`}>
        {score.avgRoi > 0 ? `${score.avgRoi.toFixed(1)}×` : '—'}
        <span className="text-sm font-bold text-slate-400 ml-2">ROI</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Cost Saving</p>
          <p className="text-sm font-bold text-emerald-400 mt-0.5">{formatRp(score.totalCostSaving)}</p>
        </div>
        <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Proyek Selesai</p>
          <p className="text-sm font-bold text-slate-200 mt-0.5">{score.projectCount} proyek</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AwardsPage() {
  const router = useRouter()

  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [scores, setScores] = useState<CompanyScore[]>([])
  const [rankingLoading, setRankingLoading] = useState(false)

  // ── Role guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const localUser = localStorage.getItem('smartproductive_user')
    if (localUser) {
      const u = JSON.parse(localUser)
      // ASUMSI: akses hanya untuk konsultan dan admin (PRD §4.1)
      if (u.role === 'perusahaan') {
        router.replace('/dashboard')
        return
      }
    }
  }, [router])

  // ── Load semua proyek dan perusahaan ──────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [projs, comps] = await Promise.all([getProjects(), getCompanies()])
      setAllProjects(projs)
      setCompanies(comps)
      setLoading(false)
    }
    load()
  }, [])

  // ── Tahun-tahun yang tersedia dari completed_at ────────────────────────────
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>()
    for (const p of allProjects) {
      if (p.status === 'completed' && p.completed_at) {
        yearSet.add(new Date(p.completed_at).getFullYear())
      }
    }
    return Array.from(yearSet).sort((a, b) => b - a) // descending
  }, [allProjects])

  // Default: tahun terbaru (atau null jika tidak ada)
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === null) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears, selectedYear])

  // ── Hitung ranking saat selectedYear berubah ───────────────────────────────
  useEffect(() => {
    if (selectedYear === null) { setScores([]); return }

    async function calcRanking() {
      setRankingLoading(true)
      try {
        const eligibleProjects = allProjects.filter(p =>
          p.status === 'completed' &&
          p.completed_at &&
          new Date(p.completed_at).getFullYear() === selectedYear
        )

        if (eligibleProjects.length === 0) { setScores([]); setRankingLoading(false); return }

        const actionPlansByProject = await getActionPlansForProjects(eligibleProjects.map(p => p.id))

        // Group per company_id
        const byCompany: Record<string, Project[]> = {}
        for (const p of eligibleProjects) {
          if (!byCompany[p.company_id]) byCompany[p.company_id] = []
          byCompany[p.company_id].push(p)
        }

        const companyScores: CompanyScore[] = []
        for (const [companyId, projs] of Object.entries(byCompany)) {
          const roiResults = projs.map(p => calculateProjectRoi(actionPlansByProject[p.id] || []))
          // A1: perusahaan hanya masuk ranking jika punya minimal 1 proyek dengan roi > 0
          const validRoi = roiResults.filter(r => r.roi > 0)
          if (validRoi.length === 0) continue

          const avgRoi = validRoi.reduce((a, r) => a + r.roi, 0) / validRoi.length
          const totalCostSaving = roiResults.reduce((a, r) => a + r.costSaving, 0)
          const totalInvestment = roiResults.reduce((a, r) => a + r.investment, 0)
          const comp = companies.find(c => c.id === companyId)

          companyScores.push({
            companyId,
            companyName: comp?.name || projs[0]?.company_name || companyId,
            avgRoi,
            totalCostSaving,
            totalInvestment,
            projectCount: projs.length,
          })
        }

        // Sort: rata-rata ROI (desc), tie-breaker: total cost saving (desc)
        companyScores.sort((a, b) => {
          if (Math.abs(b.avgRoi - a.avgRoi) > 0.0001) return b.avgRoi - a.avgRoi
          return b.totalCostSaving - a.totalCostSaving
        })

        setScores(companyScores)
      } finally {
        setRankingLoading(false)
      }
    }

    calcRanking()
  }, [selectedYear, allProjects, companies])

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: 'var(--gold-400)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                <Trophy className="h-7 w-7 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-100">Productivity Awards</h1>
                <p className="text-xs text-slate-500 mt-0.5">Ranking perusahaan berdasarkan rata-rata ROI program bimbingan</p>
              </div>
            </div>
          </div>

          {/* ── Filter Tahun ── */}
          {availableYears.length > 0 && (
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Periode</label>
              <div className="relative">
                <select
                  id="awards-year-filter"
                  value={selectedYear ?? ''}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="appearance-none bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 pr-8 text-slate-200 text-sm font-semibold focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>Tahun {y}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Empty state: tidak ada proyek dengan completed_at sama sekali ── */}
      {availableYears.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-800 p-16 text-center">
          <Trophy className="h-12 w-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-semibold">Belum ada data periode untuk Productivity Awards</p>
          <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto">
            Data akan muncul setelah proyek pertama selesai dengan tanggal penyelesaian tercatat.
          </p>
        </div>
      )}

      {/* ── Ranking Content ── */}
      {availableYears.length > 0 && (
        <>
          {rankingLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-t-transparent border-yellow-400" />
              <span className="ml-3 text-sm text-slate-400">Menghitung ranking...</span>
            </div>
          ) : scores.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center">
              <p className="text-slate-400 font-semibold">Tidak ada perusahaan dengan data valid untuk tahun {selectedYear}</p>
              <p className="text-xs text-slate-600 mt-2">Pastikan proyek sudah punya ROI &gt; 0 dan diselesaikan pada periode ini.</p>
            </div>
          ) : (
            <>
              {/* ── Top 3 Medal Cards ── */}
              <div className={`grid gap-4 ${
                scores.length === 1 ? 'grid-cols-1 max-w-sm' :
                scores.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                'grid-cols-1 md:grid-cols-3'
              }`}>
                {scores.slice(0, 3).map((s, i) => (
                  <MedalCard key={s.companyId} score={s} rank={(i + 1) as 1 | 2 | 3} />
                ))}
              </div>

              {/* ── Rank 4+ List ── */}
              {scores.length > 3 && (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/20 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-800">
                    <h2 className="text-sm font-bold text-slate-300">Ranking Selanjutnya</h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40">
                        <th className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Rank</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Perusahaan</th>
                        <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Rata-rata ROI</th>
                        <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Cost Saving</th>
                        <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Proyek</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {scores.slice(3).map((s, i) => (
                        <tr key={s.companyId} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-slate-500 font-bold text-sm">#{i + 4}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-600 shrink-0" />
                              <span className="font-semibold text-slate-200">{s.companyName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="font-bold text-indigo-400">{s.avgRoi.toFixed(1)}× Lipat</span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="font-semibold text-emerald-400">{formatRp(s.totalCostSaving)}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-slate-400">{s.projectCount}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
