'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getProjects, getCompanies, createProject } from '@/lib/db'
import { Project, Company } from '@/lib/mockData'
import { FolderKanban, Search, Plus, Calendar, ArrowRight, Activity } from 'lucide-react'
import { PROJECT_STATUS_LABELS } from '@/lib/utils'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  
  // New Project Form
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCompanyId, setNewCompanyId] = useState('')
  const [newStartDate, setNewStartDate] = useState('2026-06-15')
  const [newEndDate, setNewEndDate] = useState('2026-09-15')

  useEffect(() => {
    async function loadData() {
      const projs = await getProjects()
      const comps = await getCompanies()
      setProjects(projs)
      setCompanies(comps)
    }
    loadData()
  }, [])

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newCompanyId) return

    const selectedCompany = companies.find(c => c.id === newCompanyId)
    const newProj = await createProject({
      title: newTitle,
      description: newDesc,
      company_id: newCompanyId,
      company_name: selectedCompany ? selectedCompany.name : 'Unknown',
      consultant_id: 'user-1',
      status: 'define',
      start_date: newStartDate,
      target_end_date: newEndDate,
    })

    setProjects([...projects, newProj])
    
    // Close modal & reset fields
    setShowNewProjectModal(false)
    setNewTitle('')
    setNewDesc('')
    setNewCompanyId('')
  }

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-indigo-400" />
            Proyek BIMKON
          </h1>
          <p className="text-xs text-slate-500">Kelola dan pantau seluruh pendampingan aktif perusahaan</p>
        </div>
        <div className="sm:ml-auto">
          <button 
            onClick={() => setShowNewProjectModal(true)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer transform hover:-translate-y-0.5"
            style={{background: 'linear-gradient(135deg, #b8860b, #d4a017, #f4c430)', color: 'var(--navy-950)', boxShadow: '0 6px 20px rgba(212,160,23,0.20)'}}
          >
            <Plus className="h-4 w-4" />
            Mulai Proyek Baru
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari proyek atau perusahaan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-350 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="define">Define</option>
            <option value="measure">Measure</option>
            <option value="analyze">Analyze</option>
            <option value="improve">Improve</option>
            <option value="control">Control</option>
            <option value="completed">Selesai</option>
          </select>
        </div>
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProjects.map(proj => {
          const statusInfo = PROJECT_STATUS_LABELS[proj.status] || { label: proj.status, color: 'bg-slate-500' }
          return (
            <div key={proj.id} className="glass-card rounded-2xl border border-slate-800/60 bg-slate-950/30 p-6 flex flex-col justify-between hover:border-slate-700 transition-all group hover:-translate-y-0.5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-indigo-400">{proj.project_code}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                    {proj.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {proj.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-850">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Perusahaan Klien</span>
                    <span className="text-sm font-medium text-slate-300">{proj.company_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Target Selesai</span>
                    <span className="text-sm font-medium text-slate-300">{proj.target_end_date}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-slate-400">Index Keberhasilan:</div>
                  <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    {proj.current_score || 0}%
                  </div>
                </div>

                <Link
                  href={`/projects/${proj.id}/define`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Buka Proyek
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{background: 'rgba(2,6,15,0.80)', backdropFilter: 'blur(8px)'}}>
          <div className="w-full max-w-lg rounded-3xl overflow-hidden" style={{background: 'var(--navy-900)', border: '1px solid var(--border-base)', boxShadow: '0 30px 80px rgba(0,0,0,0.60)'}}>
            <div className="px-6 py-4 flex items-center justify-between" style={{borderBottom: '1px solid var(--border-base)', background: 'var(--navy-950)'}}>
              <h3 className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>Mulai Proyek BIMKON Baru</h3>
              <button 
                onClick={() => setShowNewProjectModal(false)}
                className="text-lg font-light transition-colors text-slate-400 hover:text-slate-250"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Judul Proyek
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Reduksi Waste Bahan Baku Cutting Line"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Deskripsi Proyek
                </label>
                <textarea
                  placeholder="Penjelasan singkat fokus improvement..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm h-20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Pilih Perusahaan Klien
                </label>
                <select
                  required
                  value={newCompanyId}
                  onChange={(e) => setNewCompanyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="">-- Pilih Perusahaan --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Target Selesai
                  </label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-250 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-350 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-650 text-sm font-semibold text-white hover:bg-indigo-600 transition-all cursor-pointer shadow-md hover:shadow-indigo-500/10"
                >
                  Buat Proyek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
