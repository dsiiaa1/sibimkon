'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getProjects, getCompanies } from '@/lib/db'
import { Project, Company } from '@/lib/mockData'
import {
  Plus,
  Folder,
  TrendingUp,
  Activity,
  Users,
  ArrowRight,
  Sparkles,
  Search
} from 'lucide-react'
import { PROJECT_STATUS_LABELS } from '@/lib/utils'
import CreateProjectModal from '@/components/CreateProjectModal'

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>('unknown')
  const [currentUser, setCurrentUser] = useState<any>(null)

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

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* Welcome Hero Banner */}
      <div className="rounded-3xl p-6 md:p-8 relative overflow-hidden hero-banner" style={{background: 'linear-gradient(135deg, var(--navy-800) 0%, var(--navy-950) 70%, var(--dark-900) 100%)', border: '1px solid var(--border-base)', boxShadow: '0 20px 60px rgba(0,0,0,0.15)'}}>
        <div className="absolute right-0 top-0 translate-x-[20%] translate-y-[-20%] w-[400px] h-[400px] rounded-full" style={{background: 'rgba(246, 246, 246, 0.04)', filter: 'blur(80px)'}} />
        <div className="absolute left-[40%] bottom-0 w-[300px] h-[200px] rounded-full" style={{background: 'rgba(212,160,23,0.03)', filter: 'blur(60px)'}} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{background: 'linear-gradient(90deg, transparent, rgba(212,160,23,0.5), transparent)'}} />
        <div className="relative z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{background: 'rgba(212,160,23,0.10)', border: '1px solid rgba(212,160,23,0.22)', color: 'var(--gold-400)'}}>
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered DMAIC Consultation Platform
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-white">
            Selamat Datang di SIBIMKON
          </h1>
          <p className="text-sm md:text-base leading-relaxed text-slate-300">
            Platform terpadu peningkatan produktivitas nasional. Digitalisasi pencatatan masalah, analisis akar penyebab, hingga pemantauan dampak ekonomi secara real-time.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all cursor-pointer transform hover:-translate-y-0.5"
              style={{background: 'linear-gradient(135deg, #b8860b, #d4a017, #f4c430)', color: 'var(--navy-950)', boxShadow: '0 6px 20px rgba(212,160,23,0.30)'}}
            >
              <Plus className="h-4 w-4" />
              Mulai Proyek Baru
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl p-6 flex items-center justify-between bg-white border border-[var(--border-base)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {currentUser?.role === 'perusahaan' ? 'Proyek Kami' : 'Proyek Aktif'}
            </p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">{activeProjectsCount} Proyek</h3>
            <p className="text-xs font-medium text-[var(--gold-600)]">Dalam pendampingan</p>
          </div>
          <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-[rgba(212,160,23,0.08)] text-[var(--gold-600)]">
            <Folder className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl p-6 flex items-center justify-between bg-white border border-[var(--border-base)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="space-y-1">
            {currentUser?.role === 'perusahaan' ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Tenaga Kerja</p>
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">{userCompany?.total_employees || 0} Orang</h3>
                <p className="text-xs font-medium text-[var(--gold-600)]">Karyawan aktif</p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Perusahaan Klien</p>
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">{companies.length} Klien</h3>
                <p className="text-xs font-medium text-[var(--gold-600)]">Terdaftar di daerah</p>
              </>
            )}
          </div>
          <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-[rgba(212,160,23,0.08)] text-[var(--gold-600)]">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl p-6 flex items-center justify-between bg-white border border-[var(--border-base)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Rata-Rata Index</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              {isNaN(avgIndex) ? '0.0' : avgIndex.toFixed(1)}%
            </h3>
            <p className="text-xs font-semibold text-emerald-600">Productivity index</p>
          </div>
          <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600">
            <Activity className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-2xl p-6 flex items-center justify-between bg-white border border-[var(--border-base)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {currentUser?.role === 'perusahaan' ? 'Rerata Peningkatan' : 'Rerata Improvement'}
            </p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">
              {isNaN(avgImprovement) ? '+0.0' : `+${avgImprovement.toFixed(1)}`}%
            </h3>
            <p className="text-xs font-medium text-[var(--gold-600)]">Peningkatan dari baseline</p>
          </div>
          <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-[rgba(212,160,23,0.08)] text-[var(--gold-600)]">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Projects List Section */}
      <div className="rounded-2xl overflow-hidden bg-[var(--navy-900)] border border-[var(--border-base)] shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark-section">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-base)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Daftar Proyek Pendampingan</h2>
            <p className="text-xs mt-0.5 text-[var(--text-secondary)]">Pilih proyek untuk memulai tahapan DMAIC</p>
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
            <div className="p-8 text-center text-[var(--text-muted)]">
              {projects.length === 0 ? 'Belum ada proyek. Klik "Mulai Proyek Baru" untuk memulai.' : 'Tidak ada proyek ditemukan.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 text-slate-600">Kode / Judul</th>
                  <th className="p-4 text-slate-600">Perusahaan Klien</th>
                  <th className="p-4 text-slate-600">Fase DMAIC</th>
                  <th className="p-4 text-center text-slate-600">Baseline vs Aktual</th>
                  <th className="p-4 text-slate-600">Target Selesai</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProjects.map((proj) => {
                  const statusInfo = PROJECT_STATUS_LABELS[proj.status] || { label: proj.status, color: 'bg-slate-500' }
                  return (
                    <tr key={proj.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                      <td className="p-4 max-w-xs">
                        <span className="project-code text-xs font-mono font-semibold text-[var(--gold-600)]">{proj.project_code}</span>
                        <h4 className="font-semibold text-[#0a192f] truncate mt-0.5">{proj.title}</h4>
                      </td>
                      <td className="p-4 font-semibold text-[#0a192f]">{proj.company_name}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="baseline-pill inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 font-semibold text-xs text-slate-600">
                          <span>{proj.baseline_score || 0}%</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-emerald-600">{proj.current_score || 0}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-mono">{proj.target_end_date}</td>
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
