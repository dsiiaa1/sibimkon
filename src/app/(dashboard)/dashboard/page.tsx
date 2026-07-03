'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { getProjects, getCompanies } from '@/lib/db'
import { Project, Company } from '@/lib/mockData'
import {
  Plus,
  TrendingUp,
  ArrowRight,
  Search,
  Building2,
  FolderOpen,
  BarChart3,
  Info,
} from 'lucide-react'
import { PROJECT_STATUS_LABELS } from '@/lib/utils'
import CreateProjectModal from '@/components/CreateProjectModal'

/* ── PRD 8.6: Count-Up Animation Hook ── */
function useCountUp(target: number, duration = 1200, decimals = 1) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setValue(target)
      return
    }
    const startTime = performance.now()
    let animationFrameId: number
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setValue(eased * target)
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      }
    }
    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
  }, [target, duration])

  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString()
}

/* ── Inline Sparkline SVG (PRD 8.3) ── */
function MiniSparkline({ data, color = '#3DD9B0' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 120
  const h = 36
  const pad = 2
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  })
  const pathD = points.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L${w - pad},${h} L${pad},${h} Z`}
        fill="url(#spark-grad)"
      />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].split(',')[0]} cy={points[points.length - 1].split(',')[1]} r="3" fill={color} />
    </svg>
  )
}

/* ── DMAIC Stage Helpers ── */
const DMAIC_STAGES = [
  { key: 'define', letter: 'D', label: 'Define' },
  { key: 'measure', letter: 'M', label: 'Measure' },
  { key: 'analyze', letter: 'A', label: 'Analyze' },
  { key: 'improve', letter: 'I', label: 'Improve' },
  { key: 'control', letter: 'C', label: 'Control' },
] as const

function getDmaicPhaseIndex(phase: string) {
  const p = (phase || 'define').toLowerCase()
  if (p === 'completed') return 5
  if (p === 'draft') return -1
  const idx = DMAIC_STAGES.findIndex(s => s.key === p)
  return idx >= 0 ? idx : 0
}

function getDmaicStepState(stageIdx: number, projectPhaseIdx: number): 'completed' | 'active' | 'inactive' {
  if (stageIdx < projectPhaseIdx) return 'completed'
  if (stageIdx === projectPhaseIdx) return 'active'
  return 'inactive'
}

/* ── Tooltip Component ── */
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#0B1220] text-white text-[10px] rounded-lg shadow-xl border border-[rgba(255,255,255,0.1)] whitespace-nowrap z-50 animate-fade-in">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-[#0B1220]" />
        </span>
      )}
    </span>
  )
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('unknown')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [hoveredProject, setHoveredProject] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const localUser = localStorage.getItem('sibimkon_user')
      let u: any = null
      if (localUser) {
        u = JSON.parse(localUser)
        setCurrentUserId(u.id || 'unknown')
        setCurrentUser(u)
      }
      const [projs, comps] = await Promise.all([getProjects(), getCompanies()])
      setProjects(projs)
      setCompanies(comps)
    }
    loadData()
  }, [])

  const viewableProjects = projects.filter(p => {
    if (currentUser?.role === 'perusahaan' && currentUser?.organization) {
      return p.company_name.toLowerCase() === currentUser.organization.toLowerCase()
    }
    return true
  })

  const filteredProjects = viewableProjects.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeProjectsCount = viewableProjects.filter(p => p.status !== 'completed').length
  const avgImprovement = viewableProjects.reduce((acc, p) => acc + ((p.current_score || 0) - (p.baseline_score || 0)), 0) / (viewableProjects.length || 1)
  const avgIndex = viewableProjects.reduce((acc, p) => acc + (p.current_score || 0), 0) / (viewableProjects.length || 1)
  const userCompany = companies.find(c => c.name.toLowerCase() === currentUser?.organization?.toLowerCase())

  /* ── PRD 8.2: compute DMAIC distribution ── */
  const dmaicDistribution = DMAIC_STAGES.map(stage => {
    const count = viewableProjects.filter(p => (p.status || 'define').toLowerCase() === stage.key).length
    return { ...stage, count }
  })
  const avgPhaseIdx = viewableProjects.length > 0
    ? Math.round(viewableProjects.reduce((acc, p) => acc + Math.max(0, Math.min(getDmaicPhaseIndex(p.status || 'define'), 4)), 0) / viewableProjects.length)
    : 0

  /* ── Sparkline data from projects ── */
  const sparklineData = viewableProjects.length > 0
    ? viewableProjects.map(p => p.current_score || 0).sort((a, b) => a - b)
    : [0, 10, 25, 40, 60]

  /* ── Animated values (PRD 8.6) ── */
  const animatedIndex = useCountUp(isNaN(avgIndex) ? 0 : avgIndex, 1400, 1)
  const animatedImprovement = useCountUp(isNaN(avgImprovement) ? 0 : avgImprovement, 1200, 1)
  const animatedProjects = useCountUp(activeProjectsCount, 800, 0)
  const animatedCompanies = useCountUp(
    currentUser?.role === 'perusahaan' ? (userCompany?.total_employees || 0) : companies.length,
    1000,
    0
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">

      {/* ═══════════════════════════════════════════════════
          PRD 8.2: DMAIC VISUAL SUMMARY HERO
          ═══════════════════════════════════════════════════ */}
      <div
        className="rounded-3xl relative overflow-hidden hero-banner"
        style={{
          background: 'linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-base) 100%)',
          border: '1px solid var(--border-base)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* Decorative glows */}
        <div className="absolute right-0 top-0 translate-x-[20%] translate-y-[-20%] w-[300px] h-[300px] rounded-full" style={{background: 'rgba(61,217,176,0.04)', filter: 'blur(80px)'}} />
        <div className="absolute left-[30%] bottom-0 w-[250px] h-[150px] rounded-full" style={{background: 'rgba(245,185,66,0.03)', filter: 'blur(60px)'}} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{background: 'linear-gradient(90deg, transparent, rgba(245,185,66,0.4), transparent)'}} />

        <div className="relative z-10 p-6 md:p-8">
          {/* Top row: context label + CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 min-w-0">
            <div className="flex items-center gap-3 min-w-0 w-full">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[rgba(128,128,128,0.15)] shadow-inner">
                <BarChart3 className="h-4 w-4 text-[#F5B942]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">DMAIC Dashboard</p>
                <p className="text-sm font-semibold text-white truncate">
                  {currentUser?.role === 'perusahaan'
                    ? `Ringkasan Proyek ${currentUser?.organization || ''}`
                    : 'Ringkasan Seluruh Proyek Pendampingan'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer hover:-translate-y-0.5 w-full sm:w-auto"
              style={{
                background: 'rgba(245,185,66,0.12)',
                color: '#F5B942',
                border: '1px solid rgba(245,185,66,0.25)',
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Proyek Baru
            </button>
          </div>

          {/* ── DMAIC 5-Stage Signature Graphic ── */}
          <div className="w-full max-w-full overflow-x-auto no-scrollbar">
            <div className="flex items-center justify-center gap-0 py-4 min-w-[min-content]">
              {DMAIC_STAGES.map((stage, idx) => {
              const state = getDmaicStepState(idx, avgPhaseIdx)
              const count = dmaicDistribution[idx].count
              return (
                <div key={stage.key} className="flex items-center">
                  {idx > 0 && <div className={`dmaic-connector ${getDmaicStepState(idx - 1, avgPhaseIdx) === 'completed' ? 'completed' : getDmaicStepState(idx - 1, avgPhaseIdx) === 'active' ? 'active' : 'inactive'}`} />}
                  <div className="dmaic-step">
                    <div className={`dmaic-step-dot ${state}`}>
                      {stage.letter}
                    </div>
                    <span className="text-[10px] font-bold tracking-wide text-slate-400" style={{ color: state === 'active' ? '#F5B942' : state === 'completed' ? '#3DD9B0' : undefined }}>
                      {stage.label}
                    </span>
                    {count > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-slate-400" style={{
                        background: state === 'active' ? 'rgba(245,185,66,0.15)' : state === 'completed' ? 'rgba(61,217,176,0.12)' : 'rgba(128,128,128,0.1)',
                        color: state === 'active' ? '#F5B942' : state === 'completed' ? '#3DD9B0' : undefined,
                      }}>
                        {count} proyek
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-center text-[11px] mt-2 text-slate-400">
            Rata-rata posisi proyek Anda saat ini berada di fase <strong className="text-[#F5B942]">{DMAIC_STAGES[avgPhaseIdx].label}</strong>
          </p>
        </div>
      </div>


      {/* ═══════════════════════════════════════════════════
          PRD 8.3: STAT CARDS — 1 Hero + 3 Supporting
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── HERO METRIC: Productivity Index (span 5 cols) ── */}
        <div className="lg:col-span-5 hero-metric-card p-6 flex flex-col justify-between min-h-[180px]">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Productivity Index
                </p>
                <Tooltip text="Rata-rata skor produktivitas seluruh proyek pendampingan Anda — semakin tinggi semakin baik.">
                  <Info className="h-3 w-3 cursor-help text-slate-400" />
                </Tooltip>
              </div>
              <MiniSparkline data={sparklineData} color="#3DD9B0" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="stat-number text-5xl text-[#3DD9B0]">
                {animatedIndex}
              </span>
              <span className="text-lg font-bold text-[rgba(61,217,176,0.6)]">%</span>
            </div>
            <p className="text-[11px] mt-2 text-slate-400">
              Indikator utama kesehatan produktivitas — mencerminkan dampak nyata bimbingan konsultansi pada operasional perusahaan
            </p>
          </div>
        </div>

        {/* ── 3 Supporting Metric Cards (span 7 cols, 3 cols each inside) ── */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Proyek Aktif */}
          <div className="rounded-2xl p-5 bg-[var(--color-bg-surface)] border border-[var(--border-base)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {currentUser?.role === 'perusahaan' ? 'Proyek Kami' : 'Proyek Aktif'}
              </p>
              {/* Micro-visualization: Mini Bar Chart instead of generic icon */}
              <div className="flex items-end gap-1 h-5 opacity-80" title="Sebaran status proyek">
                <div className="w-1.5 bg-[var(--gold-600)] h-2 rounded-t-sm"></div>
                <div className="w-1.5 bg-[var(--gold-600)] h-4 rounded-t-sm"></div>
                <div className="w-1.5 bg-[var(--gold-600)] h-3 rounded-t-sm"></div>
                <div className="w-1.5 bg-[var(--gold-600)] h-5 rounded-t-sm"></div>
              </div>
            </div>
            <div>
              <span className="stat-number text-2xl text-white">{animatedProjects}</span>
              <span className="text-sm font-semibold ml-1.5 text-slate-400">proyek</span>
            </div>
            <p className="text-[10px] text-[var(--gold-600)] font-semibold mt-1">Dalam pendampingan aktif</p>
          </div>

          {/* Tenaga Kerja / Klien */}
          <div className="rounded-2xl p-5 bg-[var(--color-bg-surface)] border border-[var(--border-base)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {currentUser?.role === 'perusahaan' ? 'Tenaga Kerja' : 'Perusahaan Klien'}
              </p>
              {/* Micro-visualization: Mini Dot Grid instead of generic icon */}
              <div className="grid grid-cols-3 gap-0.5 w-5 h-5 opacity-80" title="Representasi Klien/Tenaga Kerja">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="bg-[var(--gold-600)] rounded-[1px]" style={{ opacity: [1, 0.4, 0.8, 0.5, 0.9, 0.3, 0.7, 0.6, 1][i] }}></div>
                ))}
              </div>
            </div>
            <div>
              <span className="stat-number text-2xl text-white">{animatedCompanies}</span>
              <span className="text-sm font-semibold ml-1.5 text-slate-400">
                {currentUser?.role === 'perusahaan' ? 'orang' : 'klien'}
              </span>
            </div>
            <p className="text-[10px] text-[var(--gold-600)] font-semibold mt-1">
              {currentUser?.role === 'perusahaan' ? 'Karyawan terdaftar' : 'Terdaftar di wilayah'}
            </p>
          </div>

          {/* Improvement */}
          <div className="rounded-2xl p-5 bg-[var(--color-bg-surface)] border border-[var(--border-base)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Peningkatan
                </p>
                <Tooltip text="Selisih rata-rata antara skor aktual dan baseline — menunjukkan seberapa besar dampak perbaikan.">
                  <Info className="h-3 w-3 cursor-help text-slate-400" />
                </Tooltip>
              </div>
              {/* Micro-visualization: Mini Sparkline Step instead of generic icon */}
              <div className="flex items-end gap-0.5 h-5 opacity-90" title="Tren peningkatan">
                <div className="w-1.5 bg-[#2bb394] h-1.5 rounded-t-[1px] opacity-40"></div>
                <div className="w-1.5 bg-[#2bb394] h-2.5 rounded-t-[1px] opacity-60"></div>
                <div className="w-1.5 bg-[#2bb394] h-4 rounded-t-[1px] opacity-80"></div>
                <div className="w-1.5 bg-[#2bb394] h-5 rounded-t-[1px]"></div>
              </div>
            </div>
            <div className="flex items-baseline">
              <span className="stat-number text-2xl text-[#2bb394]">+{animatedImprovement}</span>
              <span className="text-sm font-bold text-[rgba(43,179,148,0.5)] ml-0.5">%</span>
            </div>
            <p className="text-[10px] text-[#2bb394] font-semibold mt-1">Dari baseline awal</p>
          </div>

        </div>
      </div>


      {/* ═══════════════════════════════════════════════════
          PRD 8.5: PROJECT LIST (dengan negative overlap)
          ═══════════════════════════════════════════════════ */}
      <div className="rounded-2xl overflow-hidden bg-[var(--color-bg-surface)] border border-[var(--border-base)] shadow-[0_8px_32px_rgba(0,0,0,0.15)] -mt-2">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-base)]">
          <div>
            <h2 className="text-lg font-bold font-display text-[var(--text-primary)]">Daftar Proyek Pendampingan</h2>
            <p className="text-xs mt-0.5 text-[var(--text-secondary)]">Pilih proyek untuk memulai atau melanjutkan siklus DMAIC</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Cari proyek atau klien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none transition-colors bg-slate-950/60 border border-[var(--border-base)] text-[var(--text-primary)] focus:border-[var(--gold-400)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto light-table">
          {filteredProjects.length === 0 ? (
            <div className="p-12 text-center">
              {projects.length === 0 ? (
                <div className="space-y-3">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-[rgba(245,185,66,0.08)] flex items-center justify-center">
                    <FolderOpen className="h-7 w-7 text-[var(--gold-600)]" />
                  </div>
                  <h3 className="font-bold text-[var(--text-primary)]">Belum ada proyek pendampingan</h3>
                  <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
                    Mulai perjalanan peningkatan produktivitas dengan membuat proyek DMAIC pertama Anda.
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
                    style={{background: 'linear-gradient(135deg, #b8860b, #d4a017, #F5B942)', color: 'var(--navy-950)'}}
                  >
                    <Plus className="h-4 w-4" /> Buat Proyek Pertama
                  </button>
                </div>
              ) : (
                <p className="text-[var(--text-muted)]">Tidak ditemukan proyek yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.</p>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse bg-transparent">
              <thead>
                <tr className="bg-[rgba(128,128,128,0.02)] border-b border-[var(--border-base)] text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-4">Kode / Judul</th>
                  <th className="p-4">Perusahaan Klien</th>
                  <th className="p-4">Fase DMAIC</th>
                  <th className="p-4 text-center">Baseline vs Aktual</th>
                  <th className="p-4">Target Selesai</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-base)] text-sm">
                {filteredProjects.map((proj) => {
                  const statusInfo = PROJECT_STATUS_LABELS[proj.status] || { label: proj.status, color: 'bg-slate-500' }
                  const phaseIdx = getDmaicPhaseIndex(proj.status || 'define')
                  const isHovered = hoveredProject === proj.id

                  return (
                    <tr
                      key={proj.id}
                      className="hover:bg-[rgba(128,128,128,0.05)] transition-colors border-b border-[var(--border-base)] relative"
                      onMouseEnter={() => setHoveredProject(proj.id)}
                      onMouseLeave={() => setHoveredProject(null)}
                    >
                      <td className="p-4 max-w-xs">
                        <span className="project-code text-xs font-mono font-semibold text-[var(--gold-600)]">{proj.project_code}</span>
                        <h4 className="font-semibold text-[var(--text-primary)] truncate mt-0.5">{proj.title}</h4>
                      </td>
                      <td className="p-4 font-semibold text-[var(--text-primary)]">{proj.company_name}</td>
                      <td className="p-4">
                        {/* PRD 8.5: DMAIC Mini Stepped Indicator */}
                        <div className="dmaic-mini-steps">
                          {DMAIC_STAGES.map((stage, idx) => {
                            const state = getDmaicStepState(idx, phaseIdx)
                            return (
                              <div key={stage.key} className="flex items-center">
                                {idx > 0 && <div className={`dmaic-mini-connector ${getDmaicStepState(idx - 1, phaseIdx) === 'completed' ? 'completed' : getDmaicStepState(idx - 1, phaseIdx) === 'active' ? 'active' : 'inactive'}`} />}
                                <div className={`dmaic-mini-dot ${state}`} title={stage.label}>
                                  {stage.letter}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {/* PRD 8.6: Hover preview */}
                        {isHovered && (
                          <div className="mt-1.5 text-[10px] font-semibold text-[var(--gold-600)] animate-fade-in">
                            Fase aktif: {phaseIdx === 5 ? 'Selesai' : phaseIdx === -1 ? 'Belum Mulai' : DMAIC_STAGES[phaseIdx]?.label || 'Selesai'}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="baseline-pill inline-flex items-center gap-2 bg-[rgba(255,255,255,0.02)] border border-[var(--border-base)] rounded-lg px-3 py-1 font-semibold text-xs text-[var(--text-secondary)]">
                          <span>{proj.baseline_score || 0}%</span>
                          <span className="text-[var(--text-muted)]">→</span>
                          <span className="text-[#2bb394] font-bold">{proj.current_score || 0}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-[var(--text-secondary)] text-xs font-mono">{proj.target_end_date}</td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/projects/${proj.id}/define`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--gold-600)] hover:text-[var(--gold-500)] transition-colors"
                        >
                          Kelola DMAIC
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <CreateProjectModal
          companies={companies}
          currentUser={currentUser}
          currentUserId={currentUserId}
          onCreated={(proj) => setProjects(prev => [...prev, proj])}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
